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
 * A player model should call AT THE START OF EACH ROUTINE AND LOOP:
 *  'if (!Match.isPlaying() || Match.isHalted()) return'
 * This assures a quick reponse to various match conditions.
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

// a depended extension MUST implement 'initHandler'
let initHandler: handler

// see the HALT HANDSHAKING for an explanation of how
// the next handlers interact
let playHandler: handler
let freezeHandler: handler
let inFieldHandler: handler
let toFieldHandler: handler

// optional
let showHandler: handler      // shows extra player information
let pointHandler: handler     // user code by onPoint
let winnerHandler: handler    // user code by onWinner

let EThalted = false
let ETnoplay = false

let ETmatchMsg: MatchMessage = MatchMessage.Reset
let ETprevMatchMsg: MatchMessage = MatchMessage.Reset
let ETplayer: Player = Player.Green
let ETpointsGreen: number = 0
let ETpointsBlue: number = 0
let ETarbiter: number = -1

function display_points() {
    basic.showNumber(ETplayer == Player.Green ? ETpointsGreen : ETpointsBlue)
}

function display_player() {
    basic.showString(ETplayer == Player.Green ? "G" : "B")
}

//##### ETmbit/General handlers #####//

function startHandler() {
    ETplayer = (ETplayer == Player.Green ? Player.Blue : Player.Green)
    if (initHandler) initHandler()
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

//##### Match status machine #####//

/*
IMPORTANT:
==========
1)
It is advisded that a dependend extension implements
the 'inFieldHandler' to detect the out-of-field status
of a model. Then it should call 'setOutOfField'

2)
It is obligated that all routines of a dependend extension 
implement 'if (!Match.isPlaying() || Match.isHalted() ) return'
as the first code line of the routine and
as the first code line of each loop

3)
It is advised that a dependend extension implements
the 'freezeHandler' to freeze the model when it is halted.

4)
It is advised that a dependend extension implements
the 'toFieldHandler' to let the model return to the field.

5)
A dependend extension may call 'forceHalting' to invoke the
halt handshaking.

HALT HANDSHAKING:
=================
HALT LOOP detects 'EThalted' flag, see remark 1) and 5)
HALT LOOP sets the 'ETnoplay' flag
HALT LOOP waits for 'EThalted' to be reset
PLAY LOOP finishes : all routines abort, see remark 2)
PLAY LOOP resets the 'EThalted' flag *)
PLAY LOOP waits for 'ETnoplay' to be reset
HALT LOOP calls the 'freezeHandler', see remark 3)
HALT LOOP calls the 'toFieldHandler', see remark 4)
HALT LOOP resets the 'ETnoplay' flag
PLAY LOOP restarts

*) Needed, otherwise the routines of the 'toFieldHandler'
will be blocked.
*/

// PLAY LOOP
basic.forever(function () {
    if (!Match.isPlaying() || ETnoplay) return
    if (playHandler) playHandler()
    EThalted = false
})

// HALT LOOP
basic.forever(function () {
    if (!Match.isPlaying()) return
    if (inFieldHandler) inFieldHandler()
    if (EThalted) {
        ETnoplay = true
        while (EThalted) pause(1)
        if (freezeHandler) freezeHandler() // freezes the robot
        if (toFieldHandler) toFieldHandler() // return to the field
        ETnoplay = false
        return
    }
})

//##### Match namespace #####//

//% color="#00CC00" icon="\uf091"
//% block="Match"
//% block.loc.nl="Wedstrijd"
namespace Match {

    export function isHalted(): boolean {
        return EThalted
    }

    export function forceHalting() {
        EThalted = true
    }

    export function setOutOfField() {
        EThalted = true
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
