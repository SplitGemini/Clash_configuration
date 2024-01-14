"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCanvasFingerprint = exports.isCanvasSupported = void 0;
const isCanvasSupported = () => {
    var elem = document.createElement('canvas');
    return !!(elem.getContext && elem.getContext('2d'));
};
exports.isCanvasSupported = isCanvasSupported;
// this working code snippet is taken from - https://github.com/artem0/canvas-fingerprinting/blob/master/fingerprinting/fingerprint.js
const getCanvasFingerprint = () => {
    // If canvas is not supported simply return a static string
    if (!(0, exports.isCanvasSupported)())
        return window.screen.height + "x" + window.screen.width;
    // draw a canvas of given text and return its data uri
    // different browser generates different dataUri based on their hardware configs
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    // https://www.browserleaks.com/canvas#how-does-it-work
    var txt = 'abz190#$%^@£éúGLaDOS!6.5[-%-&*]@345876 <canvas>';
    ctx.textBaseline = "top";
    ctx.font = "32px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f1680e";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#0c6d9e";
    ctx.fillText(txt, 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText(txt, 4, 17);
    ctx.fillStyle = "rgba(12, 24, 10, 0.2)";
    ctx.fillText(txt, 10, 107);
    ctx.rotate(.03);
    ctx.fillText(txt, 4, 17);
    ctx.fillStyle = "rgb(155,255,5)";
    ctx.shadowBlur=8;
    ctx.shadowColor="red";
    ctx.fillRect(20,12,100,5);
    return canvas.toDataURL();
};
exports.getCanvasFingerprint = getCanvasFingerprint;
