export default { showList, destroyList };

var ListViewEnum = {
    YOURLIST: 1,
    DISCOVER: 2,
    properties:
    {
        1: {
            name: "YOUR LIST",
            value: 1,
            selector: "#yourListTab"
        },
        2: {
            name: "DISCOVER",
            value: 2,
            selector: "#discoverTab"
        }
    }
}

var currentListView = ListViewEnum.YOURLIST;

/**
 * @param {string} category
 * @param {firebase.firestore.Firestore} firestore
 */
export function showList(category, firestore) {
    document.querySelector(ListViewEnum.properties[currentListView].selector).classList.add('selected');
    document.querySelector('#swrlList').classList.remove('hidden');
    var swrlsRef = firestore.collection("swrls");
    if (swrlsRef) {
        console.log("Getting Swrls for: " + category);
        swrlsRef.where("category", "==", category).get()
            .then(function (querySnapshot) {
                document.querySelector('#loadingSwrls').classList.add('hidden');
                if (!querySnapshot.empty) {
                    querySnapshot.forEach(function (swrl) {
                        console.log(JSON.stringify(swrl));
                    })
                } else {
                    console.log("No Swrls found");
                    showNoSwrlsView(category);
                }
            })
            .catch(function (error) {
                console.error("Couldn't get swrls! " + JSON.stringify(error));
            })
    } else {
        console.log("No Swrls found");
        document.querySelector('#loadingSwrls').classList.add('hidden');
        showNoSwrlsView(category);
    }
}

export function destroyList() {
    document.querySelector('#swrlList').classList.add('hidden');
    document.querySelector('#loadingSwrls').classList.remove('hidden');
    document.querySelector('#noSwrls').classList.add('hidden');
}

function showNoSwrlsView(category) {
    document.querySelector('#noSwrls').classList.remove('hidden');
}
