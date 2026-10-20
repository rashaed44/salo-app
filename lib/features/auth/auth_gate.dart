import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../core/networking/salo_api_client.dart';
import '../../core/storage/salo_storage.dart';
import '../../data/models/salo_user.dart';
import '../../data/repositories/auth_repository.dart';
import '../home/salo_shell.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final api = SaloApiClient();
  late final AuthRepository auth = AuthRepository(
    api: api,
    storage: SaloStorage(),
  );
  SaloUser? user;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    try {
      user = await auth.restore();
    } catch (_) {
      user = null;
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (loading)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (user != null) {
      return SaloShell(
        user: user!,
        api: api,
        onLogout: () async {
          await auth.logout();
          if (mounted) setState(() => user = null);
        },
      );
    }
    return AuthScreen(
      onAuthenticated: (value) => setState(() => user = value),
      auth: auth,
    );
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    required this.onAuthenticated,
    required this.auth,
    super.key,
  });
  final ValueChanged<SaloUser> onAuthenticated;
  final AuthRepository auth;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final formKey = GlobalKey<FormState>();
  final display = TextEditingController();
  final username = TextEditingController();
  final password = TextEditingController();
  bool register = false;
  bool busy = false;
  String? error;

  @override
  void dispose() {
    display.dispose();
    username.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!(formKey.currentState?.validate() ?? false)) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final session = register
          ? await widget.auth.register(
              display.text.trim(),
              username.text.trim(),
              password.text,
            )
          : await widget.auth.login(username.text.trim(), password.text);
      widget.onAuthenticated(session.user);
    } on DioException catch (e) {
      setState(
        () => error =
            (e.response?.data is Map
                    ? (e.response?.data['error'] ?? 'تعذر الاتصال بالخادم')
                    : 'تعذر الاتصال بالخادم')
                .toString(),
      );
    } catch (e) {
      setState(() => error = 'تعذر إتمام العملية. تحقق من الاتصال بالخادم.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(
                    Icons.forum_rounded,
                    size: 72,
                    color: Color(0xFF18D9FF),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'SALO',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF18D9FF),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    register ? 'أنشئ حسابك وابدأ الدردشة' : 'مرحباً بعودتك',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),
                  if (register) ...[
                    TextFormField(
                      controller: display,
                      decoration: const InputDecoration(
                        labelText: 'الاسم الظاهر',
                      ),
                      validator: (v) =>
                          (v ?? '').trim().isEmpty ? 'اكتب اسمك' : null,
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: username,
                    decoration: const InputDecoration(
                      labelText: 'اسم المستخدم',
                    ),
                    validator: (v) => (v ?? '').trim().length < 3
                        ? 'اسم المستخدم قصير جداً'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: password,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'كلمة المرور'),
                    validator: (v) => (v ?? '').length < 8
                        ? 'كلمة المرور 8 أحرف على الأقل'
                        : null,
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      error!,
                      style: const TextStyle(color: Colors.redAccent),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: busy ? null : submit,
                    child: busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(register ? 'إنشاء الحساب' : 'تسجيل الدخول'),
                  ),
                  TextButton(
                    onPressed: busy
                        ? null
                        : () => setState(() {
                            register = !register;
                            error = null;
                          }),
                    child: Text(
                      register ? 'لديك حساب؟ تسجيل الدخول' : 'إنشاء حساب جديد',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
