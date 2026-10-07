import 'package:flutter/material.dart';
import '../../core/networking/salo_api_client.dart';
import '../../core/theme/salo_theme.dart';

class StoriesPage extends StatefulWidget {
  const StoriesPage({required this.api, super.key});
  final SaloApiClient api;
  @override
  State<StoriesPage> createState() => _StoriesPageState();
}

class _StoriesPageState extends State<StoriesPage> {
  List<Map<String, dynamic>> stories = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await widget.api.content('story');
      final rows = (response.data['items'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (mounted) setState(() => stories = rows);
    } catch (_) {
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _create() async {
    final controller = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('ستوري جديدة'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'اكتب ما تريد مشاركته...',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('نشر'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (text == null || text.isEmpty) return;
    try {
      await widget.api.createContent('story', {'text': text});
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم نشر الستوري')));
        _load();
      }
    } catch (_) {
      if (mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تعذر نشر الستوري')));
    }
  }

  Future<void> _delete(int id) async {
    try {
      await widget.api.deleteContent(id);
      if (mounted) setState(() => stories.removeWhere((s) => s['id'] == id));
    } catch (_) {}
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
              'الستوري',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            IconButton(
              onPressed: _create,
              icon: const Icon(
                Icons.add_a_photo_outlined,
                color: SaloColors.cyan,
              ),
            ),
          ],
        ),
        const Text(
          'شارك لحظاتك مع أصدقائك',
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
        if (!loading && stories.isEmpty) const _EmptyStories(),
        ...stories.map(
          (story) => _StoryCard(
            story: story,
            onDelete: () => _delete((story['id'] as num).toInt()),
          ),
        ),
      ],
    ),
  );
}

class _EmptyStories extends StatelessWidget {
  const _EmptyStories();
  @override
  Widget build(BuildContext context) => const Card(
    color: SaloColors.card,
    child: Padding(
      padding: EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(Icons.auto_awesome, color: SaloColors.cyan, size: 48),
          SizedBox(height: 10),
          Text('لا توجد ستوريات بعد'),
          SizedBox(height: 5),
          Text(
            'كن أول من يشارك قصة جديدة اليوم',
            style: TextStyle(color: SaloColors.muted),
          ),
        ],
      ),
    ),
  );
}

class _StoryCard extends StatelessWidget {
  const _StoryCard({required this.story, required this.onDelete});
  final Map<String, dynamic> story;
  final VoidCallback onDelete;
  @override
  Widget build(BuildContext context) {
    final payload = (story['payload'] as Map?)?.cast<String, dynamic>() ?? {};
    return Card(
      color: SaloColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: SaloColors.border),
      ),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Color(0xFF0A5A7F),
          child: Icon(Icons.auto_awesome, color: SaloColors.cyan),
        ),
        title: Text((payload['text'] ?? 'ستوري').toString()),
        subtitle: const Text(
          'مشاركة من مجتمع SALO',
          style: TextStyle(color: SaloColors.muted),
        ),
        trailing: IconButton(
          onPressed: onDelete,
          icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
        ),
      ),
    );
  }
}
