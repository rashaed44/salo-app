import 'package:flutter/material.dart';
import '../../core/networking/salo_api_client.dart';
import '../../core/theme/salo_theme.dart';

class GroupsPage extends StatefulWidget {
  const GroupsPage({required this.api, super.key});
  final SaloApiClient api;
  @override
  State<GroupsPage> createState() => _GroupsPageState();
}

class _GroupsPageState extends State<GroupsPage> {
  List<Map<String, dynamic>> groups = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await widget.api.groups();
      final rows = (response.data['groups'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (mounted) setState(() => groups = rows);
    } catch (_) {
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _create() async {
    final name = TextEditingController();
    final description = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('إنشاء مجموعة'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'اسم المجموعة'),
            ),
            TextField(
              controller: description,
              decoration: const InputDecoration(labelText: 'الوصف'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('إنشاء'),
          ),
        ],
      ),
    );
    if (ok == true && name.text.trim().length >= 2) {
      try {
        await widget.api.createGroup(name.text.trim(), description.text.trim());
        _load();
      } catch (_) {}
    }
    name.dispose();
    description.dispose();
  }

  Future<void> _join(int id) async {
    try {
      await widget.api.joinGroup(id);
      if (mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم الانضمام للمجموعة')));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('المجموعات'),
      actions: [IconButton(onPressed: _create, icon: const Icon(Icons.add))],
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(14),
              children: [
                if (groups.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text('لا توجد مجموعات بعد'),
                    ),
                  ),
                ...groups.map(
                  (group) => Card(
                    color: SaloColors.card,
                    child: ListTile(
                      leading: const Icon(Icons.groups, color: SaloColors.cyan),
                      title: Text((group['name'] ?? 'مجموعة').toString()),
                      subtitle: Text(
                        (group['description'] ?? 'مجموعة عامة').toString(),
                      ),
                      trailing: TextButton(
                        onPressed: () => _join((group['id'] as num).toInt()),
                        child: const Text('انضمام'),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    ),
  );
}
