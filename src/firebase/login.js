export default { swrlUser, setUpLogin };

export var swrlUser;
var firebase;

export function setUpLogin(firebaseInstance) {
    firebase = firebaseInstance;
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelector("#logout").addEventListener("touchstart", logout);
    document.querySelector("#login").addEventListener("click", login);
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            swrlUser = user;
            console.log("user logged in: " + swrlUser.displayName);

            if (swrlUser.isAnonymous) {
                handleAnonymous();
            } else {
                handleLoginSuccess()
            }
        } else {
            swrlUser = undefined;
            console.log("user not logged in");
            loginAnonymously();
            handleLogout();
        }
    });
}

function loginAnonymously() {
    firebase.auth().signInAnonymously().catch(function (error) {
        console.error("anonymous log in failed: " + JSON.stringify(error));
        handleLogout();
    });
}

function logout() {
    firebase.auth().signOut();
    document.querySelector("#openSidebarMenu").checked = false;
    handleLogout();
}

function login() {
    var provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().getRedirectResult().then(function (result) {
        swrlUser = result.user;
        console.log("firebase user from get redirect result: " + swrlUser.displayName);
        handleLoginSuccess();
    }).catch(function (error) {
        console.error("got redirect error: " + JSON.stringify(error));
        firebase.auth().signInWithRedirect(provider).then(function () {
            return firebase.auth().getRedirectResult();
        }).then(function (result) {
            swrlUser = result.user;
            console.log("firebase user: " + swrlUser.displayName);
            handleLoginSuccess();
        }).catch(function (error) {
            console.error("Login failed: " + JSON.stringify(error))
            loginAnonymously();
        });
    })
}

function handleLoginSuccess() {
    document.querySelector("#image").src = swrlUser.photoURL;
    document.querySelector("#image").classList.remove('hidden');
    document.querySelector("#logout").classList.remove('hidden');
    document.querySelector("#login").classList.add('hidden');
    document.querySelector("#loginStatus").innerHTML = swrlUser.displayName;
}

function handleAnonymous() {
    document.querySelector("#image").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#loginStatus").innerHTML = "Mystery Swrler";
}

function handleLogout() {
    document.querySelector("#image").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#loginStatus").innerHTML = "Not Logged In";
}