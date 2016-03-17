Package.describe({
    name: "coniel:friendships",
    summary: "Provides social network style Friend Requests and Friendships.",
    version: "0.0.1",
    git: "https://github.com/coniel/friendships.git"
});

Package.onUse(function (api) {
    api.versionsFrom("1.2");

    api.use([
        "coniel:base-model@0.3.0",
        "coniel:user-model@0.0.1",
        "mdg:validated-method@1.0.1",
        "didericis:callpromise-mixin@0.0.1",
        "tunifight:loggedin-mixin@0.1.0",
        "ecmascript",
        "es5-shim"
    ]);

    api.addFiles([
        "common/friend-model.js",
        "common/friend-request-model.js",
        "common/friend-user-extensions.js",
        "common/friend-request-user-extensions.js"
    ]);

    api.export(["Friend", "FriendRequest"]);
});
