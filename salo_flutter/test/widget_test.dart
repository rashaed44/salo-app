import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:salo_flutter/core/networking/salo_api_client.dart';
import 'package:salo_flutter/core/storage/salo_storage.dart';
import 'package:salo_flutter/data/repositories/auth_repository.dart';
import 'package:salo_flutter/features/auth/auth_gate.dart';

void main() {
  testWidgets('SALO auth screen renders Arabic entry form', (tester) async {
    final auth = AuthRepository(api: SaloApiClient(), storage: SaloStorage());
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ar'),
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: AuthScreen(auth: auth, onAuthenticated: (_) {}),
        ),
      ),
    );
    expect(find.text('SALO'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(find.text('إنشاء حساب جديد'), findsOneWidget);
  });
}
