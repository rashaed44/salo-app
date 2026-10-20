import 'package:flutter/material.dart';
import '../../core/networking/salo_api_client.dart';
import '../../core/theme/salo_theme.dart';
import 'chat_detail_page.dart';
import 'groups_page.dart';

class ChatsPage extends StatefulWidget {
  const ChatsPage({required this.api, super.key});
  final SaloApiClient api;
  @override
  State<ChatsPage> createState() => _ChatsPageState();
}

class _ChatsPageState extends State<ChatsPage> {
  List<Map<String, dynamic>> conversations = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final response = await widget.api.conversations();
      final rows = (response.data['conversations'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (mounted) setState(() => conversations = rows);
    } catch (_) {
      if (mounted)
        setState(() => error = 'تعذر تحميل المحادثات. تحقق من الاتصال.');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _load,
    color: SaloColors.cyan,
    child: ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'دردشتي',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            IconButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => GroupsPage(api: widget.api)),
              ),
              icon: const Icon(Icons.groups_outlined, color: SaloColors.cyan),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'محادثاتك وقنواتك في مكان واحد',
          style: TextStyle(color: SaloColors.muted),
        ),
        const SizedBox(height: 18),
        if (loading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(30),
              child: CircularProgressIndicator(),
            ),
          ),
        if (!loading && error != null)
          Card(
            color: SaloColors.card,
            child: ListTile(
              leading: const Icon(Icons.wifi_off, color: Colors.orange),
              title: Text(error!),
              trailing: IconButton(
                onPressed: _load,
                icon: const Icon(Icons.refresh),
              ),
            ),
          ),
        if (!loading && error == null && conversations.isEmpty)
          const _EmptyChats(),
        ...conversations.map((chat) => _ChatTile(data: chat, api: widget.api)),
      ],
    ),
  );
}

class _EmptyChats extends StatelessWidget {
  const _EmptyChats();
  @override
  Widget build(BuildContext context) => Card(
    color: SaloColors.card,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: const BorderSide(color: SaloColors.border),
    ),
    child: const Padding(
      padding: EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(Icons.chat_bubble_outline, color: SaloColors.cyan, size: 46),
          SizedBox(height: 10),
          Text('لا توجد محادثات بعد'),
          SizedBox(height: 5),
          Text(
            'ابدأ محادثة جديدة من قائمة الأصدقاء',
            style: TextStyle(color: SaloColors.muted),
          ),
        ],
      ),
    ),
  );
}

class _ChatTile extends StatelessWidget {
  const _ChatTile({required this.data, required this.api});
  final Map<String, dynamic> data;
  final SaloApiClient api;
  @override
  Widget build(BuildContext context) {
    final title =
        (data['name'] ?? data['username'] ?? data['displayName'] ?? 'محادثة')
            .toString();
    final preview = (data['lastMessage'] ?? data['text'] ?? 'لا توجد رسائل')
        .toString();
    return Card(
      color: SaloColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: SaloColors.border),
      ),
      child: ListTile(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ChatDetailPage(
              api: api,
              username: data['username'].toString(),
              name: title,
            ),
          ),
        ),
        leading: const CircleAvatar(
          backgroundColor: Color(0xFF0A5A7F),
          child: Icon(Icons.person, color: SaloColors.cyan),
        ),
        title: Text(title),
        subtitle: Text(
          preview,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: SaloColors.muted),
        ),
        trailing: const Icon(Icons.chevron_left),
      ),
    );
  }
}
