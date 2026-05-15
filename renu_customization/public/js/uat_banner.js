$(function () {
    // Avoid duplicate banners
    if (document.querySelector("#uat-banner")) return;

    // Create banner div
    let banner = document.createElement("div");
    banner.id = "uat-banner";
    banner.innerText = "UAT Instance – For testing only";
    banner.style.backgroundColor = "red";
    banner.style.color = "white";
    banner.style.textAlign = "center";
    banner.style.fontWeight = "bold";
    banner.style.padding = "6px";
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.zIndex = "1031"; // higher than navbar
    banner.style.fontSize = "14px";

    // Push navbar down so banner is visible
    let navbar = document.querySelector(".navbar");
    if (navbar) {
        navbar.style.marginTop = "30px";
    }

    document.body.prepend(banner);
});
