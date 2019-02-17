export default function setUpLogin() {
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelector("#login").addEventListener("click", login);
    trySilentLogin();
}

function isAvailable() {
    window.plugins.googleplus.isAvailable(function (avail) { alert(avail) });
}

function login() {
    console.log("Logging in");
    window.plugins.googleplus.login(
        {},
        function (user) {
            handleLoginSuccess(user)
        },
        function (msg) {
            document.querySelector("#feedback").innerHTML = "error: " + msg;
        }
    );
}

function trySilentLogin() {
    window.plugins.googleplus.trySilentLogin(
        {},
        function (user) {
            handleLoginSuccess(user);
        },
        function (msg) {
            document.querySelector("#login").classList.remove('hidden');
        }
    );
}

function handleLoginSuccess(user) {
    document.querySelector("#image").src = user.imageUrl;
    document.querySelector("#image").classList.remove('hidden');
    document.querySelector("#logout").classList.remove('hidden');
    document.querySelector("#login").classList.add('hidden');
    document.querySelector("#feedback").innerHTML = "Hi, " + user.displayName;
}

function logout() {
    window.plugins.googleplus.logout(
        function (msg) {
            document.querySelector("#image").classList.add('hidden');

            document.querySelector("#logout").classList.add('hidden');

            document.querySelector("#login").classList.remove('hidden');

            document.querySelector("#feedback").innerHTML = "Logged out";
        },
        function (msg) {
            document.querySelector("#feedback").innerHTML = msg;
        }
    );
}

function disconnect() {
    window.plugins.googleplus.disconnect(
        function (msg) {
            document.querySelector("#image").style.visibility = 'hidden';
            document.querySelector("#feedback").innerHTML = msg;
        },
        function (msg) {
            document.querySelector("#feedback").innerHTML = msg;
        }
    );
}