import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/networking/salo_api_client.dart';
import '../../core/theme/salo_theme.dart';
import '../../data/models/salo_user.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({
    required this.user,
    required this.api,
    required this.onLogout,
    super.key,
  });
  final SaloUser user;
  final SaloApiClient api;
  final Future<void> Function() onLogout;
  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  Map<String, dynamic> values = {
    'notifications': true,
    'sound': true,
    'messagePreview': true,
    'readReceipts': true,
    'onlineStatus': true,
    'darkMode': true,
    'autoDownload': false,
    'dataSaver': false,
    'language': 'العربية',
  };
  String? openCategory;

  static const categories = [
    ('account', 'الحساب', 'بياناتك وملفك الشخصي', Icons.person_outline),
    (
      'privacy',
      'الخصوصية والأمان',
      'التحكم في ظهورك وأمانك',
      Icons.lock_outline,
    ),
    (
      'notifications',
      'الإشعارات',
      'التنبيهات والأصوات',
      Icons.notifications_none,
    ),
    ('chat', 'الدردشة', 'الوسائط والمحادثات', Icons.chat_bubble_outline),
    ('appearance', 'المظهر', 'الوضع والألوان', Icons.palette_outlined),
    (
      'storage',
      'التخزين والبيانات',
      'الاستخدام والتنزيل',
      Icons.inventory_2_outlined,
    ),
    ('language', 'اللغة', 'العربية', Icons.language),
    ('market', 'السوق', 'البيع والشراء', Icons.storefront_outlined),
    ('support', 'المساعدة والدعم', 'نحتاج إلى مساعدتك', Icons.help_outline),
    ('about', 'حول SALO', 'الإصدار والشروط', Icons.info_outline),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString('dardshti_settings');
    if (raw != null && mounted)
      setState(
        () => values = {
          ...values,
          ...Map<String, dynamic>.from(jsonDecode(raw) as Map),
        },
      );
    try {
      final response = await widget.api.readState();
      final state = Map<String, dynamic>.from(
        (response.data['state'] as Map?) ?? {},
      );
      final remoteRaw = state['dardshti_settings'];
      if (remoteRaw is String) {
        final remote = Map<String, dynamic>.from(jsonDecode(remoteRaw) as Map);
        if (mounted) setState(() => values = {...values, ...remote});
        await p.setString('dardshti_settings', jsonEncode(values));
      }
    } catch (_) {
      // Offline mode keeps the local settings and retries on the next open.
    }
  }

  Future<void> _save(String key, dynamic value) async {
    setState(() => values[key] = value);
    final p = await SharedPreferences.getInstance();
    final encoded = jsonEncode(values);
    await p.setString('dardshti_settings', encoded);
    try {
      await widget.api.writeState({'dardshti_settings': encoded});
    } catch (_) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم الحفظ على الجهاز وسيتم مزامنته عند عودة الاتصال'),
          ),
        );
      return;
    }
    if (mounted)
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تم حفظ التغيير على حسابك'),
          duration: Duration(milliseconds: 900),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    if (openCategory != null) return _detail(openCategory!);
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Row(
          children: [
            CircleAvatar(
              backgroundColor: SaloColors.cyan.withValues(alpha: .18),
              child: const Icon(Icons.person, color: SaloColors.cyan),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.user.displayName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '@${widget.user.username}',
                    style: const TextStyle(color: SaloColors.muted),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        const Text(
          'الإعدادات',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: SaloColors.cyan,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'اختر القسم الذي تريد التحكم فيه',
          style: TextStyle(color: SaloColors.muted),
        ),
        const SizedBox(height: 14),
        ...categories.map(
          (c) => Card(
            color: SaloColors.card,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: SaloColors.border),
            ),
            child: ListTile(
              leading: Icon(c.$4, color: SaloColors.cyan),
              title: Text(c.$2),
              subtitle: Text(
                c.$3,
                style: const TextStyle(color: SaloColors.muted),
              ),
              trailing: const Icon(Icons.chevron_left),
              onTap: () => setState(() => openCategory = c.$1),
            ),
          ),
        ),
      ],
    );
  }

  Widget _detail(String id) {
    final title = categories.firstWhere((c) => c.$1 == id).$2;
    final rows = <Widget>[];
    if (id == 'account')
      rows.addAll([
        ListTile(
          leading: const Icon(Icons.person, color: SaloColors.cyan),
          title: const Text('الاسم'),
          subtitle: Text(widget.user.displayName),
        ),
        ListTile(
          leading: const Icon(Icons.alternate_email, color: SaloColors.cyan),
          title: const Text('اسم المستخدم'),
          subtitle: Text('@${widget.user.username}'),
        ),
      ]);
    if (id == 'privacy')
      rows.addAll([
        _switch(
          'onlineStatus',
          'إظهار حالة الاتصال',
          'السماح للآخرين بمعرفة أنك متصل',
        ),
        _switch('readReceipts', 'إيصالات القراءة', 'إظهار قراءة الرسائل'),
      ]);
    if (id == 'notifications')
      rows.addAll([
        _switch('notifications', 'إشعارات الرسائل', 'التنبيهات عند وصول رسالة'),
        _switch('sound', 'أصوات الإشعارات', 'تشغيل صوت التنبيه'),
      ]);
    if (id == 'chat')
      rows.addAll([
        _switch(
          'messagePreview',
          'معاينة الرسائل',
          'عرض محتوى الرسالة في التنبيه',
        ),
        _switch(
          'autoDownload',
          'تحميل الوسائط تلقائياً',
          'تنزيل الصور والفيديوهات',
        ),
      ]);
    if (id == 'appearance')
      rows.addAll([
        _switch('darkMode', 'الوضع الداكن', 'الحفاظ على تصميم SALO الداكن'),
      ]);
    if (id == 'storage')
      rows.addAll([
        _switch('dataSaver', 'توفير البيانات', 'تقليل استخدام بيانات الجوال'),
        ListTile(
          title: const Text('حذف الملفات المؤقتة'),
          trailing: const Icon(Icons.chevron_left),
          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('لا توجد ملفات مؤقتة قابلة للحذف حالياً'),
            ),
          ),
        ),
      ]);
    if (id == 'language')
      rows.addAll([
        RadioListTile<String>(
          value: 'العربية',
          groupValue: values['language'],
          title: const Text('العربية'),
          onChanged: (v) => _save('language', v),
        ),
        RadioListTile<String>(
          value: 'English',
          groupValue: values['language'],
          title: const Text('English'),
          onChanged: (v) => _save('language', v),
        ),
      ]);
    if (id == 'market')
      rows.add(_switch('notifications', 'إشعارات السوق', 'عروض وطلبات جديدة'));
    if (id == 'support')
      rows.addAll([
        ListTile(
          leading: const Icon(Icons.help_outline, color: SaloColors.cyan),
          title: const Text('مركز المساعدة'),
          trailing: const Icon(Icons.chevron_left),
          onTap: () {},
        ),
        ListTile(
          leading: const Icon(
            Icons.report_problem_outlined,
            color: SaloColors.cyan,
          ),
          title: const Text('الإبلاغ عن مشكلة'),
          trailing: const Icon(Icons.chevron_left),
          onTap: () {},
        ),
      ]);
    if (id == 'about')
      rows.addAll([
        const ListTile(title: Text('إصدار التطبيق'), trailing: Text('1.0.0')),
        const ListTile(
          title: Text('SALO'),
          subtitle: Text('التواصل، المشاركة، والمجتمع'),
        ),
      ]);
    if (id == 'account')
      rows.add(
        ListTile(
          leading: const Icon(Icons.logout, color: Colors.redAccent),
          title: const Text(
            'تسجيل الخروج',
            style: TextStyle(color: Colors.redAccent),
          ),
          onTap: widget.onLogout,
        ),
      );
    return Column(
      children: [
        AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_forward),
            onPressed: () => setState(() => openCategory = null),
          ),
          title: Text(title),
          automaticallyImplyLeading: false,
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(14),
            children: [
              Card(
                color: SaloColors.card,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: SaloColors.border),
                ),
                child: Column(children: rows),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _switch(String key, String title, String subtitle) => SwitchListTile(
    value: values[key] == true,
    onChanged: (v) => _save(key, v),
    activeColor: SaloColors.cyan,
    title: Text(title),
    subtitle: Text(subtitle, style: const TextStyle(color: SaloColors.muted)),
  );
}
