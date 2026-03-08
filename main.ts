/*
File:      github.com/ETmbit/match.ts
Copyright: ETmbit, 2026

License:
This file is part of the ETmbit extensions for MakeCode for micro:bit.
It is free software and you may distribute it under the terms of the
GNU General Public License (version 3 or later) as published by the
Free Software Foundation. The full license text you find at
https://www.gnu.org/licenses.

Disclaimer:
ETmbit extensions are distributed without any warranty.

Dependencies:
ETmbit/general
*/

/*
 * IMPORTANT NOTE
 * ==============
 * A player robot should call AT THE START OF EACH CALL OR LOOP:
 *  'if (!Match.isPlaying()) return'
 * This assures a quick reponse to match messages.
 */


//##### Declarations #####/


enum Player {
    //% block="green player"
    //% block.loc.nl="groene speler"
    Green,
    //% block="blue player"
    //% block.loc.nl="blauwe speler"
    Blue,
}

enum MatchMessage {
    Reset,
    Stop,
    Play,
    GameOver,
    PointGreen,
    PointBlue,
    DisallowGreen,
    DisallowBlue,
    DisqualGreen,
    DisqualBlue
}

enum WaitFor {
    None = 0x0000,
    InField = 0x0001,
    OnBorder = 0x0002,
    OutOfField = 0x0004,
    NoTrace = 0x0008,
    Traced = 0x0010,
    Far = 0x0020,
    Near = 0x0040,
    CamNoTrace = 0x0080,
    CamTraced = 0x0100,
    CamFar = 0x0200,
    CamNear = 0x0400,
    OppHeading = 0x0800,
    All = 0xFFFF,
}

let initHandler: handler      // initializes and resets a model
let freezeHandler: handler    // freezes a robot
let playHandler: handler      // (re)starts playing
let showHandler: handler      // shows extra player information
let pointHandler: handler     // user code by onPoint
let winnerHandler: handler    // user code by onWinner

let isInFieldHandler: rethandler        // must return 0/1 for 'robot is on the border'
let isOnBorderHandler: rethandler       // must return 0/1 for 'robot is on the border'
let isOutOfFieldHandler: rethandler     // must return 0/1 for 'robot is outside the field'
let hasTracedHandler: rethandler        // must return 0/1 for 'object traced'
let hasNoTraceHandler: rethandler       // must return 0/1 for 'object not traced'
let isFarHandler: rethandler            // must return 0/1 for 'object is far away'
let isNearHandler: rethandler           // must return 0/1 for 'object is near'
let camHasTracedHandler: rethandler     // must return 0/1 for 'object traced'
let camHasNoTraceHandler: rethandler    // must return 0/1 for 'object not traced'
let camIsFarHandler: rethandler         // must return 0/1 for 'object is far away'
let camIsNearHandler: rethandler        // must return 0/1 for 'object is near'
let isHeadingToOppHandler: rethandler   // must return 0/1 for 'heading to opponent'

let ETmatchMsg: MatchMessage = MatchMessage.Reset
let ETprevMatchMsg: MatchMessage = MatchMessage.Reset
let ETplayer: Player = Player.Green
let ETpointsGreen: number = 0
let ETpointsBlue: number = 0
let ETarbiter: number = -1


//##### ETmbit/General handlers #####//


function display_points() {
    basic.showNumber(ETplayer == Player.Green ? ETpointsGreen : ETpointsBlue)
}

function display_player() {
    basic.showString(ETplayer == Player.Green ? "G" : "B")
}

function startHandler() {
    ETplayer = (ETplayer == Player.Green ? Player.Blue : Player.Green)
    initHandler()
    display_player()
    if (showHandler) showHandler()
}
General.registerStartHandler(startHandler)

function stopHandler() {
    ETmatchMsg = MatchMessage.Stop
    if (freezeHandler) freezeHandler()
}
General.registerStopHandler(stopHandler)

function messageHandler(message: string) {
    ETmatchMsg = +message
    switch (ETmatchMsg) {
        case MatchMessage.Reset:
            ETpointsGreen = 0
            ETpointsBlue = 0
            if (stopHandler) stopHandler()
            if (initHandler) initHandler()
            break
        case MatchMessage.Stop:
            if (stopHandler) stopHandler()
            break
        // case MatchMessage.Play is handled in the forever loop below
        case MatchMessage.GameOver:
            if (ETplayer == Player.Green && ETpointsGreen > ETpointsBlue) {
                if (winnerHandler) winnerHandler()
                if (showHandler) showHandler()
            }
            if (ETplayer == Player.Blue && ETpointsBlue > ETpointsGreen) {
                if (winnerHandler) winnerHandler()
                if (showHandler) showHandler()
            }
            break
        case MatchMessage.PointGreen:
            if (stopHandler) stopHandler()
            ETpointsGreen += 1
            display_points()
            if (ETplayer == Player.Green || ETplayer == ETarbiter) {
                if (pointHandler) pointHandler()
            }
            if ((ETplayer == Player.Green) && showHandler) showHandler()
            break
        case MatchMessage.PointBlue:
            if (stopHandler) stopHandler()
            ETpointsBlue += 1
            display_points()
            if (ETplayer == Player.Blue || ETplayer == ETarbiter) {
                if (pointHandler) pointHandler()
            }
            if ((ETplayer == Player.Blue) && showHandler) showHandler()
            break
        case MatchMessage.DisallowGreen:
            if (ETpointsGreen > 0) ETpointsGreen -= 1
            display_points()
            ETmatchMsg = ETprevMatchMsg
            break
        case MatchMessage.DisallowBlue:
            if (ETpointsBlue > 0) ETpointsBlue -= 1
            display_points()
            ETmatchMsg = ETprevMatchMsg
            break
        case MatchMessage.DisqualGreen:
            if (stopHandler) stopHandler()
            ETpointsGreen = 0
            display_points()
            if ((ETplayer == Player.Blue) && winnerHandler)
                winnerHandler()
            break
        case MatchMessage.DisqualBlue:
            if (stopHandler) stopHandler()
            ETpointsBlue = 0
            display_points()
            if ((ETplayer == Player.Green) && winnerHandler)
                winnerHandler()
            break
    }
    ETprevMatchMsg = ETmatchMsg
}
General.registerMessageHandler("MA", messageHandler)


//##### Match handling #####//


basic.forever(function () {
    if (!Match.isPlaying()) return
    let mayplay = true
    if (isOutOfFieldHandler) mayplay = (isOutOfFieldHandler() == 0)
    if (mayplay) {
        if (playHandler) playHandler()
    }
    else {
        if (freezeHandler) freezeHandler()
    }

})

//% color="#00CC00" icon="\uf091"
//% block="Match"
//% block.loc.nl="Wedstrijd"
namespace Match {

    let waitingFor: number = 0  // WaitFor reasons to stop the Match.waitFor() routine
    let waitingEnd: number = 0  // WaitFor reason that stopped the Match.waitFor() routine

    export function registerWaitFor(waitfor: WaitFor, code: () => number) {
        switch (waitfor) {
            case WaitFor.InField: isInFieldHandler = code; break
            case WaitFor.OnBorder: isOnBorderHandler = code; break
            case WaitFor.OutOfField: isOutOfFieldHandler = code; break
            case WaitFor.NoTrace: hasNoTraceHandler = code; break
            case WaitFor.Traced: hasTracedHandler = code; break
            case WaitFor.Far: isFarHandler = code; break
            case WaitFor.Near: isNearHandler = code; break
            case WaitFor.CamNoTrace: camHasNoTraceHandler = code; break
            case WaitFor.CamTraced: camHasTracedHandler = code; break
            case WaitFor.CamFar: camIsFarHandler = code; break
            case WaitFor.CamNear: camIsNearHandler = code; break
            case WaitFor.OppHeading: isHeadingToOppHandler = code; break
        }
    }

    export function waitFor() {
        waitingEnd = WaitFor.None
        while (true) {
            if (!isPlaying()) return
            if (waitingFor & WaitFor.InField) {
                if (isInFieldHandler && (isInFieldHandler() == 1)) {
                    waitingEnd = WaitFor.InField
                    return
                }
            }
            if (waitingFor & WaitFor.OnBorder) {
                if (isOnBorderHandler && (isOnBorderHandler() == 1)) {
                    waitingEnd = WaitFor.OnBorder
                    return
                }
            }
            if (waitingFor & WaitFor.OutOfField) {
                waitingEnd = WaitFor.OutOfField
                if (isOutOfFieldHandler && (isOutOfFieldHandler() == 1)) {
                    waitingEnd = WaitFor.OutOfField
                    return
                }
            }
            if (waitingFor & WaitFor.NoTrace) {
                if (hasNoTraceHandler && (hasNoTraceHandler() == 1)) {
                    waitingEnd = WaitFor.NoTrace
                    return
                }
            }
            if (waitingFor & WaitFor.Traced) {
                if (hasTracedHandler && (hasTracedHandler() == 1)) {
                    waitingEnd = WaitFor.Traced
                    return
                }
            }
            if (waitingFor & WaitFor.Far) {
                if (isFarHandler && (isFarHandler() == 1)) {
                    waitingEnd = WaitFor.Far
                    return
                }
            }
            if (waitingFor & WaitFor.Near) {
                if (isNearHandler && (isNearHandler() == 1)) {
                    waitingEnd = WaitFor.Near
                    return
                }
            }
            if (waitingFor & WaitFor.CamNoTrace) {
                if (camHasNoTraceHandler && (camHasNoTraceHandler() == 1)) {
                    waitingEnd = WaitFor.CamNoTrace
                    return
                }
            }
            if (waitingFor & WaitFor.CamTraced) {
                if (camHasTracedHandler && (camHasTracedHandler() == 1)) {
                    waitingEnd = WaitFor.CamTraced
                    return
                }
            }
            if (waitingFor & WaitFor.CamFar) {
                if (camIsFarHandler && (camIsFarHandler() == 1)) {
                    waitingEnd = WaitFor.CamFar
                    return
                }
            }
            if (waitingFor & WaitFor.CamNear) {
                if (camIsNearHandler && (camIsNearHandler() == 1)) {
                    waitingEnd = WaitFor.CamNear
                    return
                }
            }
            if (waitingFor & WaitFor.OppHeading) {
                if (isHeadingToOppHandler && (isHeadingToOppHandler() == 1)) {
                    waitingEnd = WaitFor.OppHeading
                    return
                }
            }
            basic.pause(1)
        }
    }

    export function setWaitingFor(waitfor: WaitFor) {
        waitingFor |= waitfor
    }

    export function clearWaitFor(waitfor: WaitFor) {
        if (waitingFor & waitfor)
            waitingFor &= ~waitfor
    }

    export function isWaitEnd(waitfor: WaitFor): boolean {
        return ((waitingEnd & waitfor) != 0)
    }

    //% block="the opponent"
    //% block.loc.nl="de tegenstander"
    export function getOpponent(): Player {
        return (ETplayer == Player.Green ? Player.Blue : Player.Green)
    }

    //% block="this player"
    //% block.loc.nl="deze speler"
    export function getPlayer(): Player {
        return ETplayer
    }

    //% block="the opponent is the %player"
    //% block.loc.nl="de tegenstander is de %player"
    export function isOpponent(player: Player): boolean {
        return (ETplayer != player)
    }

    //% block="this is the %player"
    //% block.loc.nl="dit is de %player"
    export function isPlayer(player: Player): boolean {
        return (ETplayer == player)
    }

    //% block="the game is in progress"
    //% block.loc.nl="het spel bezig is"
    export function isPlaying(): boolean {
        return (ETmatchMsg == MatchMessage.Play)
    }

    //% color="#802080"
    //% block="code for the winner to celebrat"
    //% block.loc.nl="code om het winnen te vieren"
    export function onWinner(code: () => void): void {
        winnerHandler = code
    }

    //% color="#802080"
    //% block="code for celebrating a point"
    //% block.loc.nl="code om een punt te vieren"
    export function onPoint(code: () => void): void {
        pointHandler = code
    }

    //% color="#802080"
    //% block="code for playing"
    //% block.loc.nl="code om te spelen"
    export function onPlay(code: () => void): void {
        playHandler = code
    }
}
