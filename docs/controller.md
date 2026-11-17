# Playing Storm Cellar with an Xbox controller

Storm Cellar, the game at the top of the [leaderboard page](https://wbp318.github.io/github-leaderboard/), plays with a game controller as well as with the keyboard and mouse or a phone's touch pad. An Xbox controller is the easy one: plug it in, press a button, and play. This page covers connecting one, what each button does, how to change them, and what to try when it isn't seen.

## Connect it

Any Xbox controller the computer itself recognises works: Xbox Series X|S, Xbox One, and Xbox 360 controllers.

- **By USB.** Plug it in. Some cables only charge, so if nothing happens, try another.
- **By Bluetooth** (Xbox Series X|S, and the later Xbox One controllers with Bluetooth):
  - **Windows:** go to Settings → Bluetooth & devices → Add device → Bluetooth. Hold the small pair button on the top of the controller until the Xbox button flashes quickly, then pick it from the list.
  - **Mac:** go to System Settings → Bluetooth, with the controller in pairing mode the same way.
- **With an Xbox Wireless Adapter** on Windows: pair it as you would with an Xbox.

Then open the page in your browser and **press any button on the controller**. Browsers keep controllers hidden from a page until a button is pressed while the page is open; that's on purpose, so sites can't fingerprint what's plugged in.

When the game sees it:
- the title says **PRESS A OR ENTER TO PLAY**;
- a note under the game says **Controller connected**;
- **Keys → Controller** shows the controller's name.

The game uses the browser's Gamepad API, which Chrome, Edge, and other Chromium browsers support, and Firefox too. Like the rest of the page, it runs best in Chromium.

## What each button does

The sticks are fixed. The **left stick** walks and steps aside, and the **right stick** turns and looks up and down. The buttons start like this, and you can change any of them:

| Action | Buttons |
|---|---|
| Start, and go on (the title and pause screens) | A, Menu |
| Shoot | RT, RB |
| Run | LT, or press the left stick in |
| Switch weapon | Y |
| Pea shooter / lightning rod | D-pad left / D-pad right |
| Move forward / back | D-pad up / D-pad down |
| Pause | Menu |
| Sound on and off | View |
| Save your progress (paused) | X |
| Load your save (on the title) | Y |

- A hit from a bug **rumbles** the controller, where the browser supports rumble. Chrome and Edge do.
- The controller only acts while the game is on screen, so pressing A while you're reading the leaderboards won't start a game.
- The keyboard and mouse keep working alongside it.

## Change the buttons

Under the game, open **Keys**, scroll to **Controller**, and choose **Set up its buttons**. The wizard goes through the 12 actions one at a time, "press the button for Shoot", and takes the next button you press.

- **Skip** keeps an action's current button.
- **Cancel** stops and changes nothing.
- **A button another action already uses swaps over:** that action takes the one you replaced, so nothing is left without a button.
- **The menu buttons** (start, save, load) can share buttons with play, because they only work on the title and pause screens. That's why Menu can both pause and go on.
- **Reset controller buttons** puts everything back as above.

Your buttons are kept in this browser on this computer, along with your keys and your saved game. A different browser or computer starts from the defaults.

## If it isn't seen

- **Press a button with the page open and in front.** Plugging in isn't enough; the browser waits for a press, and for the tab to be the one you're looking at.
- **Check the computer sees it.** On Windows, search for "Set up USB game controllers" (or run `joy.cpl`); the controller should be listed, and its buttons should light up when pressed.
- **Close anything that grabs controllers.** Steam's controller support can take over Xbox controllers for itself; quit Steam, or turn off its Xbox configuration support, and press a button again.
- **Buttons named "Button 1", "Button 2"…** The browser didn't recognise the layout, which happens with some third-party controllers. The game still works: run the wizard and press whatever feels right for each action. On such controllers the sticks can be swapped, and the sticks can't be changed yet.
- **Bluetooth acting oddly?** Update the controller with the Xbox Accessories app on Windows; older firmware pairs less reliably. A USB cable always works.
- **It worked, then stopped.** The controller may have gone to sleep: press the Xbox button to wake it, then any other button.

## Privacy

Nothing about your controller leaves your browser. The page talks only to its own site, and its [Content Security Policy](optimjack.md#why-this-site-was-not-affected) doesn't let it load anything from anywhere else.
