import engine from "./engine.cpp";
import './main.css';

const asm = engine();
console.log("Loading wasm");

function keycode(str, scancode) {
	asm._pressKey((str || '\0').charCodeAt(0), scancode);
}

function onKeydown(e) {
console.log(e);
	if (e.code == "ArrowUp" && e.shiftKey == false) keycode(0, 0x48);
	else if (e.code == "ArrowUp" && e.shiftKey == true) keycode('8', 0x48);
	else if (e.code == "ArrowDown" && e.shiftKey == false) keycode(0, 0x50);
	else if (e.code == "ArrowDown" && e.shiftKey == true) keycode('2', 0x50);
	else if (e.code == "ArrowLeft" && e.shiftKey == false) keycode(0, 0x4B);
	else if (e.code == "ArrowLeft" && e.shiftKey == true) keycode('4', 0x4B);
	else if (e.code == "ArrowRight" && e.shiftKey == false) keycode(0, 0x4D);
	else if (e.code == "ArrowRight" && e.shiftKey == true) keycode('6', 0x4D);
	else if (e.code == "Enter") keycode('\x0D', 0);
	else if (e.key.length == 1) keycode(e.key.toUpperCase(), 0);
}

asm.then(() => {
	console.log("Engine ready");
	
	document.body.addEventListener('keydown', onKeydown);

	asm._start();
	console.log("Started game");
});
