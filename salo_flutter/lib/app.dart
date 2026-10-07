import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/theme/salo_theme.dart';
import 'features/auth/auth_gate.dart';

class SaloApp extends StatelessWidget {
  const SaloApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SALO',
      debugShowCheckedModeBanner: false,
      theme: SaloTheme.dark,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const AuthGate(),
    );
  }
}
