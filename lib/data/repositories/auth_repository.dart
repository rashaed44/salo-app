import '../../core/networking/salo_api_client.dart';
import '../../core/storage/salo_storage.dart';
import '../models/salo_user.dart';

class AuthRepository {
  AuthRepository({required this.api, required this.storage});
  final SaloApiClient api;
  final SaloStorage storage;

  Future<SaloSession> login(String username, String password) =>
      _authenticate(() => api.login(username, password));

  Future<SaloSession> register(
    String displayName,
    String username,
    String password,
  ) => _authenticate(() => api.register(displayName, username, password));

  Future<SaloUser?> restore() async {
    final token = await storage.readToken();
    if (token == null || token.isEmpty) return null;
    api.setToken(token);
    try {
      final response = await api.me();
      return SaloUser.fromJson(
        Map<String, dynamic>.from(response.data['user'] as Map),
      );
    } catch (_) {
      await storage.clearToken();
      api.clearToken();
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await api.logout();
    } finally {
      await storage.clearToken();
      api.clearToken();
    }
  }

  Future<SaloSession> _authenticate(Future<dynamic> Function() request) async {
    final response = await request();
    final data = Map<String, dynamic>.from(response.data as Map);
    final token = data['token'].toString();
    final user = SaloUser.fromJson(
      Map<String, dynamic>.from(data['user'] as Map),
    );
    await storage.writeToken(token);
    api.setToken(token);
    return SaloSession(token: token, user: user);
  }
}
