import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SaloStorage {
  SaloStorage({FlutterSecureStorage? secure})
    : _secure = secure ?? const FlutterSecureStorage();
  final FlutterSecureStorage _secure;

  Future<void> writeToken(String token) =>
      _secure.write(key: 'dardshti_api_token', value: token);
  Future<String?> readToken() => _secure.read(key: 'dardshti_api_token');
  Future<void> clearToken() => _secure.delete(key: 'dardshti_api_token');

  Future<void> writeJson(String key, Object value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(value));
  }

  Future<Map<String, dynamic>?> readJson(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    if (raw == null) return null;
    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : null;
  }
}
