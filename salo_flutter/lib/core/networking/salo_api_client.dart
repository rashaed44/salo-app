import 'package:dio/dio.dart';

/// REST client for the existing SALO backend. It intentionally does not
/// connect Flutter directly to MySQL and does not change the API contract.
class SaloApiClient {
  SaloApiClient({String? baseUrl})
    : _dio = Dio(
        BaseOptions(
          baseUrl:
              baseUrl ??
              const String.fromEnvironment(
                'SALO_API_BASE_URL',
                defaultValue: 'http://10.0.2.2:3000',
              ),
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 20),
          headers: {'Accept': 'application/json'},
        ),
      );

  final Dio _dio;

  void setToken(String token) =>
      _dio.options.headers['Authorization'] = 'Bearer $token';
  void clearToken() => _dio.options.headers.remove('Authorization');

  Future<Response<dynamic>> health() => _dio.get('/api/health');
  Future<Response<dynamic>> login(String username, String password) =>
      _dio.post(
        '/api/legacy/auth/login',
        data: {'username': username, 'password': password},
      );
  Future<Response<dynamic>> register(
    String displayName,
    String username,
    String password,
  ) => _dio.post(
    '/api/legacy/auth/register',
    data: {
      'displayName': displayName,
      'username': username,
      'password': password,
    },
  );
  Future<Response<dynamic>> me() => _dio.get('/api/legacy/auth/me');
  Future<Response<dynamic>> logout() => _dio.post('/api/legacy/auth/logout');
  Future<Response<dynamic>> listContent(String kind) =>
      _dio.get('/api/legacy/content/$kind');
  Future<Response<dynamic>> messages(String username) =>
      _dio.get('/api/legacy/messages', queryParameters: {'username': username});
  Future<Response<dynamic>> messagesAfter(String username, int afterId) =>
      _dio.get(
        '/api/legacy/messages',
        queryParameters: {'username': username, 'afterId': afterId},
      );
  Future<Response<dynamic>> sendMessage(
    String username,
    String text, {
    String? clientMessageId,
  }) => _dio.post(
    '/api/legacy/messages',
    data: {
      'username': username,
      'text': text,
      if (clientMessageId != null) 'clientMessageId': clientMessageId,
    },
  );
  Future<Response<dynamic>> conversations() =>
      _dio.get('/api/legacy/inbox/conversations');
  Future<Response<dynamic>> readState() => _dio.get('/api/legacy/state');
  Future<Response<dynamic>> writeState(Map<String, dynamic> state) =>
      _dio.put('/api/legacy/state', data: {'state': state});
  Future<Response<dynamic>> content(String kind) =>
      _dio.get('/api/legacy/content/$kind');
  Future<Response<dynamic>> createContent(
    String kind,
    Map<String, dynamic> payload,
  ) => _dio.post('/api/legacy/content/$kind', data: {'payload': payload});
  Future<Response<dynamic>> deleteContent(int id) =>
      _dio.delete('/api/legacy/content/$id');
  Future<Response<dynamic>> groups() => _dio.get('/api/legacy/groups');
  Future<Response<dynamic>> createGroup(String name, String description) =>
      _dio.post(
        '/api/legacy/groups',
        data: {'name': name, 'description': description, 'privacy': 'public'},
      );
  Future<Response<dynamic>> joinGroup(int id) =>
      _dio.post('/api/legacy/groups/$id/join');
}
