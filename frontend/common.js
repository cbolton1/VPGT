let darkMode = true;

function showToast(message) {
    $("body").append($(`<div class="toast">${message}</div>`));
    let toast = $(".toast:last").get();
    $(toast).offset();
    $(toast).css("bottom", "200px");

    setTimeout(() => {
        $(toast).css("bottom", "-300px");
        setTimeout( () => $(toast).remove(), 1000);
    }, 1500);
}

function toggleDarkMode() {
    darkMode = !darkMode;
    let modeStr = darkMode ? "Dark" : "Light";
    let cssVars = [
        "inputBackgroundColor", "navColor", "menuColor", 
        "navText", "placeholder", "topNavColor", "topNavHover", "buttonBorder", "buttonBackground", 
        "buttonText", "buttonHighlight", "buttonPressed"
    ];
    
    cssVars.forEach(cssVar => {
        let root = document.querySelector(":root");
        let varStr = "--" + cssVar;
        let newColor = `var(${varStr + modeStr})`;
        root.style.setProperty(varStr, newColor);
    });

    let images = $("#toggleDarkMode img");
    
    if (darkMode)
    {
        $(images[0]).css("display", "none");
        $(images[1]).css("display", "inline");
    }
    else
    {
        $(images[0]).css("display", "inline");
        $(images[1]).css("display", "none");
    }
}