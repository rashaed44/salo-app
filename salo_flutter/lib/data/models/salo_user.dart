class SaloUser {
  const SaloUser({
    required this.id,
    required this.username,
    required this.displayName,
    this.email,
  });

  final int? id;
  final String username;
  final String displayName;
  final String? email;

  factory SaloUser.fromJson(Map<String, dynamic> json) => SaloUser(
    id: json['id'] as int?,
    username: (json['username'] ?? '').toString(),
    displayName: (json['displayName'] ?? json['name'] ?? json['username'] ?? '')
        .toString(),
    email: json['email']?.toString(),
  );
}

class SaloSession {
  const SaloSession({required this.token, required this.user});
  final String token;
  final SaloUser user;
}
