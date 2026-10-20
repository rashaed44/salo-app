import 'package:flutter/material.dart';

abstract final class SaloColors {
  static const navy = Color(0xFF041B2C);
  static const surface = Color(0xFF06263B);
  static const card = Color(0xFF082F4A);
  static const cardDeep = Color(0xFF061F34);
  static const cyan = Color(0xFF18D9FF);
  static const cyanSoft = Color(0xFF83B6C6);
  static const border = Color(0xFF0A5A7F);
  static const text = Color(0xFFF4FBFF);
  static const muted = Color(0xFF79AABD);
}

abstract final class SaloTheme {
  static ThemeData get dark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: SaloColors.navy,
    colorScheme: ColorScheme.fromSeed(
      seedColor: SaloColors.cyan,
      brightness: Brightness.dark,
      surface: SaloColors.surface,
    ),
    fontFamily: 'sans',
    appBarTheme: const AppBarTheme(
      backgroundColor: SaloColors.cardDeep,
      foregroundColor: SaloColors.text,
      centerTitle: true,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: SaloColors.cardDeep,
      indicatorColor: SaloColors.cyan.withValues(alpha: .16),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: SaloColors.cardDeep,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: SaloColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: SaloColors.border),
      ),
    ),
  );
}
