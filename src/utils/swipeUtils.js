/** @type {HTMLInputElement} */
// @ts-ignore
const openSidebarMenu = document.getElementById("openSidebarMenu");
const fade = document.getElementById('fade');

export default function bindMenuSwipeAction() {
    var mainBody = document.getElementById('menuSwipeable');
    swipedetect(mainBody, function (swipedir) {
        openCloseMenu(swipedir);
    })
    var menu = document.getElementById('sidebarMenu');
    swipedetect(menu, function (swipedir) {
        openCloseMenu(swipedir);
    });
    fade.addEventListener('click', (e) => {
        e.stopPropagation();
        openSidebarMenu.checked = false;
        fade.classList.add('hidden');
    });
    openSidebarMenu.addEventListener('click', (e) => {
        /** @type {HTMLInputElement} */
        // @ts-ignore
        const menuButton = e.target;
        if (menuButton.checked) {
            fade.classList.remove('hidden');
        } else {
            fade.classList.add('hidden');
        }
    })
}

var debug = true;

var swipedetect = function (el, callback) {
    var touchsurface = el,
        swipedir,
        startX,
        startY,
        distX,
        distY,
        threshold = 50, //required min distance traveled to be considered swipe
        restraint = 100, // maximum distance allowed at the same time in perpendicular direction
        allowedTime = 500, // maximum time allowed to travel that distance
        elapsedTime,
        startTime,
        handleswipe = callback || function (swipedir) { }

    touchsurface.addEventListener('touchstart', function (e) {
        var touchobj = e.changedTouches[0]
        swipedir = 'none'
        distX = 0
        distY = 0
        startX = touchobj.pageX
        startY = touchobj.pageY
        startTime = new Date().getTime() // record time when finger first makes contact with surface
        e.preventDefault()
    }, false)

    touchsurface.addEventListener('touchmove', function (e) {
        e.preventDefault() // prevent scrolling when inside DIV
    }, false)

    touchsurface.addEventListener('touchend', function (e) {
        if (debug) console.log('touch finished');
        var touchobj = e.changedTouches[0]
        distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
        distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
        elapsedTime = new Date().getTime() - startTime // get time elapsed
        if (debug) console.log("x, y: " + distX + ", " + distY + " time: " + elapsedTime);

        if (elapsedTime <= allowedTime) { // first condition for awipe met
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) { // 2nd condition for horizontal swipe met
                swipedir = (distX < 0) ? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
            }
            else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) { // 2nd condition for vertical swipe met
                swipedir = (distY < 0) ? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
            }
        }
        handleswipe(swipedir)
        e.preventDefault()
    }, false)
}

function openCloseMenu(swipedir) {
    if (debug) console.log("direction: " + swipedir);
    //swipedir contains either "none", "left", "right", "top", or "down"
    if (swipedir == 'right') {
        openSidebarMenu.checked = true;
        fade.classList.remove('hidden');
    }
    if (swipedir == 'left') {
        openSidebarMenu.checked = false;
        fade.classList.add('hidden');
    }
}
// export default { bindMenuSwipeAction };