import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/networking/salo_api_client.dart';
import '../../core/theme/salo_theme.dart';

class ChatDetailPage extends StatefulWidget {
  const ChatDetailPage({
    required this.api,
    required this.username,
    required this.name,
    super.key,
  });
  final SaloApiClient api;
  final String username;
  final String name;
  @override
  State<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends State<ChatDetailPage> {
  final input = TextEditingController();
  final scroll = ScrollController();
  List<Map<String, dynamic>> messages = [];
  Timer? timer;
  bool loading = true;
  bool sending = false;
  int lastId = 0;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadInitial();
    timer = Timer.periodic(const Duration(seconds: 4), (_) => _refresh());
  }

  @override
  void dispose() {
    timer?.cancel();
    input.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> _loadInitial() async {
    try {
      final response = await widget.api.messages(widget.username);
      final rows = _rows(response.data['messages']);
      if (mounted)
        setState(() {
          messages = rows;
          lastId = _maxId(rows);
          loading = false;
        });
      _scrollBottom();
    } catch (_) {
      if (mounted)
        setState(() {
          loading = false;
          error = 'تعذر تحميل الرسائل';
        });
    }
  }

  Future<void> _refresh() async {
    if (lastId == 0 && messages.isEmpty) return _loadInitial();
    try {
      final response = await widget.api.messagesAfter(widget.username, lastId);
      final rows = _rows(response.data['messages']);
      if (rows.isNotEmpty && mounted)
        setState(() {
          messages = [...messages, ...rows];
          lastId = _maxId(messages);
        });
      if (rows.isNotEmpty) _scrollBottom();
    } catch (_) {}
  }

  List<Map<String, dynamic>> _rows(dynamic value) => (value as List? ?? [])
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
  int _maxId(List<Map<String, dynamic>> rows) {
    var max = 0;
    for (final row in rows) {
      final id = (row['id'] as num?)?.toInt() ?? 0;
      if (id > max) max = id;
    }
    return max;
  }

  void _scrollBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scroll.hasClients)
        scroll.animateTo(
          scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
    });
  }

  Future<void> _send() async {
    final text = input.text.trim();
    if (text.isEmpty || sending) return;
    setState(() => sending = true);
    input.clear();
    try {
      final response = await widget.api.sendMessage(
        widget.username,
        text,
        clientMessageId: 'flutter_${DateTime.now().millisecondsSinceEpoch}',
      );
      final message = response.data['message'];
      if (message is Map && mounted) {
        setState(() {
          messages = [
            ...messages,
            {...Map<String, dynamic>.from(message), 'sent': true, 'text': text},
          ];
          lastId = _maxId(messages);
        });
        _scrollBottom();
      }
    } catch (_) {
      if (mounted) {
        input.text = text;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تعذر إرسال الرسالة')));
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.name), leading: const BackButton()),
      body: Column(
        children: [
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                ? Center(child: Text(error!))
                : ListView.builder(
                    controller: scroll,
                    padding: const EdgeInsets.all(14),
                    itemCount: messages.length,
                    itemBuilder: (_, i) {
                      final message = messages[i];
                      final sent = message['sent'] == true;
                      return Align(
                        alignment: sent
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          constraints: const BoxConstraints(maxWidth: 300),
                          decoration: BoxDecoration(
                            color: sent
                                ? SaloColors.cyan.withValues(alpha: .18)
                                : SaloColors.card,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: sent ? SaloColors.cyan : SaloColors.border,
                            ),
                          ),
                          child: Text(
                            (message['text'] ?? 'رسالة مرفقة').toString(),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: input,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.newline,
                      decoration: const InputDecoration(
                        hintText: 'اكتب رسالة...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: sending ? null : _send,
                    icon: sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
