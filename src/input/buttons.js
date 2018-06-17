import { audioContextSetup } from '../sound.js';
import { mouseTrackingEnd } from './mouse.js';
import * as GameMenu from '../gameMenu.js';

const canvas = document.getElementById('framebuffer');
const gamepad_button_mappings = [];

export function updateMappedGamepadButton(pressed, index)
{
    const handler = gamepad_button_mappings[index];
    if (handler) {
        handler(pressed, index);
    }
}

export function addButtonEvents(button_element, down, up, click)
{
    const down_wrapper = function (e)
    {
        mouseTrackingEnd();
        audioContextSetup();
        if (!click) {
            e.preventDefault();
        }
        if (down) {
            down(e);
        }
    };

    const up_wrapper = function (e)
    {
        if (!click) {
            e.preventDefault();
        }
        if (up) {
            up(e);
        }
        button_element.blur();
        canvas.focus();
    };

    const options = {
        passive: !!click
    };

    button_element.addEventListener('mousedown', down_wrapper, options);
    button_element.addEventListener('mouseup', up_wrapper, options);
    button_element.addEventListener('mouseleave', up_wrapper, options);

    button_element.addEventListener('touchstart', down_wrapper, options);
    button_element.addEventListener('touchend', up_wrapper, options);
    button_element.addEventListener('touchcancel', up_wrapper, options);

    if (click) {
        button_element.addEventListener('click', click);
    }

    const gamepad_button = parseInt(button_element.dataset.gamepad);
    if (gamepad_button >= 0) {
        gamepad_button_mappings[gamepad_button] = (pressed) => {
            if (pressed) {
                down();
            } else {
                if (click) {
                    click();
                }
                up();
            }
        };
    }
}

function controlCode(key)
{
    return String.fromCharCode(key.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) + 1);
}

export function init(engine)
{
    // Fade in the controls as soon as this Javascript is ready
    document.getElementById('engine_controls').classList.remove('hidden');

    function keycode(ascii, scancode)
    {
        if (typeof(ascii) != typeof(0)) {
            ascii = ascii.length == 1 ? ascii.charCodeAt(0) : parseInt(ascii, 0);
        }
        if (engine.calledRun) {
            engine.pressKey(ascii, scancode);
            engine.autoSave();
        }
        GameMenu.pressKey(engine, ascii, scancode);
        audioContextSetup();
    }

    document.body.addEventListener('keydown', function (e)
    {
        const code = e.code || e.key || '';
        const key = e.key || '';
        const shift = e.shiftKey;
        const ctrl = e.ctrlKey;
        const alt = e.altKey;
        const meta = e.metaKey;
        const plain = !(ctrl || alt || meta);

        if (code.includes('Arrow')) {
            // Most keys can coexist with mouse tracking, but arrow keys will take over.
            mouseTrackingEnd();
        }

        if (code == 'ArrowUp' && !shift)         keycode(0, 0x48);
        else if (code == 'ArrowUp' && shift)     keycode('8', 0x48);
        else if (code == 'ArrowDown' && !shift)  keycode(0, 0x50);
        else if (code == 'ArrowDown' && shift)   keycode('2', 0x50);
        else if (code == 'ArrowLeft' && !shift)  keycode(0, 0x4B);
        else if (code == 'ArrowLeft' && shift)   keycode('4', 0x4B);
        else if (code == 'ArrowRight' && !shift) keycode(0, 0x4D);
        else if (code == 'ArrowRight' && shift)  keycode('6', 0x4D);
        else if (code == 'Backspace' && plain)   keycode('\x08', 0);
        else if (code == 'Enter' && plain)       keycode('\x0D', 0x1C);
        else if (code == 'Escape' && plain)      keycode('\x1b', 0x01);

        else if (key.length == 1 && plain) {
            // Letter keys
            keycode(key.toUpperCase(), 0);
        } else if (key.length == 1 && ctrl && !alt && !meta) {
            // CTRL keys, useful for sound on-off and for cheats
            keycode(controlCode(key), 0);
        } else {
            // Unrecognized special key, let the browser keep it.
            return;
        }

        // Eat events for any recognized keys
        e.preventDefault();
    });

    let delay = null;
    let repeater = null;
    function stopRepeat()
    {
        if (delay !== null) {
            clearTimeout(delay);
            delay = null;
        }
        if (repeater !== null) {
            clearInterval(repeater);
            repeater = null;
        }
    }

    for (let button of Array.from(document.getElementsByClassName('keyboard_btn'))) {
        const press = () => {
            delay = null;
            keycode(button.dataset.ascii || '0x00', parseInt(button.dataset.scancode || '0', 0));
        };

        addButtonEvents(button, () => {
            button.classList.add('active_btn');
            press();
            stopRepeat();
            if (button.dataset.rdelay && button.dataset.rrate) {
                delay = setTimeout(() => {
                    stopRepeat();
                    repeater = setInterval(press, parseInt(button.dataset.rrate));
                }, parseInt(button.dataset.rdelay));
            }
        }, () => {
            button.classList.remove('active_btn');
            stopRepeat();
        });
    }

    for (let button of Array.from(document.getElementsByClassName('setspeed_btn'))) {
        addButtonEvents(button, () => {
            if (engine.calledRun) {
                for (let sibling of button.parentNode.children) {
                    sibling.classList.remove('active_btn');
                }
                button.classList.add('active_btn');
                engine.setSpeed(parseFloat(button.dataset.speed));
            }
        });
    }

    for (let button of Array.from(document.getElementsByClassName('loadgame_btn'))) {
        addButtonEvents(button, () => {
            button.classList.add('active_btn');
        }, () => {
            button.classList.remove('active_btn');
        }, () => {
            if (engine.calledRun) {
                engine.loadGame();
            }
        });
    }

    for (let button of Array.from(document.getElementsByClassName('savegame_btn'))) {
        addButtonEvents(button, () => {
            button.classList.add('active_btn');
        }, () => {
            button.classList.remove('active_btn');
        }, () => {
            if (engine.calledRun) {
                engine.saveGame();
            }
        });
    }

    // Loader for arbitrary saved files
    for (let button of Array.from(document.getElementsByClassName('loadsavefile_btn'))) {
        addButtonEvents(button, () => {
            button.classList.add('active_btn');
        }, () => {
            button.classList.remove('active_btn');
        }, () => {
            if (engine.calledRun) {
                engine.loadSaveFilePicker();
            }
        });
    }

    for (let button of Array.from(document.getElementsByClassName('palette_btn'))) {
        addButtonEvents(button, () => {
            for (let sibling of Array.from(button.parentNode.children)) {
                sibling.classList.remove('active_btn');
            }
            button.classList.add('active_btn');

            engine.then(function () {
                if (button.dataset.name == 'hgr') {
                    engine.setHGRColors();
                } else if (button.dataset.name == 'cga') {
                    engine.setCGAColors();
                }
                if (button.dataset.src) {
                    engine.setColorTilesFromImage(button.dataset.src);
                }
            });
        });
    }
}
