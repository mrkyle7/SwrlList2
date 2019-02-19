var myfirebaseUIAuthInstance;
var swrlUser;

export default function initialiseFirebaseAuth() {
    setUpLoginButtons();
    FirebaseUIAuth.initialise({
        "providers": ["GOOGLE", "FACEBOOK", "EMAIL", "ANONYMOUS"],
        "tosUrl": "https://swrl-list.herokuapp.com/terms_of_service.html",
        "privacyPolicyUrl": "https://swrl-list.herokuapp.com/privacy_policy.html",
        "theme": "FirebaseUILogonTheme",
        "logo": "icon.png",
        "uiElement": "FireBaseUIAuth",
        "anonymous": true,
        "smartLockEnabled": true,
        "smartLockHints": true,
        "browser": {
            apiKey: 'AIzaSyAWAhzSXf6M_dhxNS4SI830qWNy-zF51wk',
            authDomain: 'swrl-1118.firebaseapp.com',
            projectId: 'swrl-1118',
        }
    }).then(function (firebaseUIAuth) {
        myfirebaseUIAuthInstance = firebaseUIAuth;
        setUpAuthListeners();
    }).catch(function (error) {
        console.error("Firebase Init failed: " + error);
    });
}

function setUpAuthListeners() {
    window.addEventListener('signinsuccess', handleLoginSuccess, false);
    window.addEventListener('signinfailure', handleLoginFailure, false);
    window.addEventListener('signinaborted', handleLoginAborted, false);

    window.addEventListener('signoutsuccess', handleLogout, false);
    window.addEventListener('signoutfailure', handleLogoutFailure, false);
}

function signInToFirebase() {
    myfirebaseUIAuthInstance.signIn();
}

function signOutOfFirebase() {
    myfirebaseUIAuthInstance.signOut();
    document.querySelector("#openSidebarMenu").checked = false;
}

function setUpLoginButtons() {
    document.querySelector("#logout").addEventListener("click", signOutOfFirebase);
    document.querySelector("#login").addEventListener("click", signInToFirebase);
}

function handleLoginSuccess(event) {
    console.log("Log in successful: " );
    console.log(event);
    swrlUser = event.detail;
    console.log(swrlUser);
    if (swrlUser.name){
        document.querySelector("#image").src = swrlUser.photoUrl;
        document.querySelector("#image").classList.remove('hidden');
        document.querySelector("#logout").classList.remove('hidden');
        document.querySelector("#login").classList.add('hidden');
        document.querySelector("#feedback").innerHTML = "Hi, " + swrlUser.name;
    } else {
        handleAnonymousLogin();
    }
}

function handleLoginFailure(event) {
    console.log("Login failed: " + event);
    showLoginButton();
    document.querySelector("#feedback").innerHTML = "Login Failed: " + event.detail.message;
}

function handleLoginAborted(event) {
    console.log("Login Aborted: " + event);
    showLoginButton();
    document.querySelector("#feedback").innerHTML = "Login Aborted";
}

function handleLogout() {
    showLoginButton();
    document.querySelector("#feedback").innerHTML = "Logged out";
}

function handleLogoutFailure(event) {
    console.log("Logout failed: " + event);
}

function handleAnonymousLogin() {
    showLoginButton();
    document.querySelector("#feedback").innerHTML = "You are logged in anonymously";
}

function showLoginButton() {
    document.querySelector("#image").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
}
