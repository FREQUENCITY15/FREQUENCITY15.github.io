(() => {
  "use strict";

  const answers = { x: 6, y: 4, z: 2 };
  const solveOrder = ["x", "z", "y"];
  const primerButton = document.getElementById("primerButton");
  const puzzleCard = document.getElementById("puzzleCard");
  const lessonText = document.getElementById("lessonText");
  const workshop = document.getElementById("workshop");
  const storyTheatre = document.getElementById("storyTheatre");
  const storyStep = document.getElementById("storyStep");
  const storyTitle = document.getElementById("storyTitle");
  const storyText = document.getElementById("storyText");
  const storyNextButton = document.getElementById("storyNextButton");
  const actionButton = document.getElementById("actionButton");
  const replayButton = document.getElementById("replayButton");
  const resetButton = document.getElementById("resetButton");
  const variableReadout = document.getElementById("variableReadout");
  const messageKicker = document.getElementById("messageKicker");
  const messageText = document.getElementById("messageText");
  const seamTheatre = document.getElementById("seamTheatre");
  const seamCaption = document.getElementById("seamCaption");
  const choices = [...document.querySelectorAll(".timber-choice")];
  const slots = [...document.querySelectorAll(".target-slot")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const storyScenes = [
    {
      step: "Scene 1 of 4",
      title: "One master. Three work poles.",
      text: "Every pole starts at exactly 12 inches. The master stays safely on the top rack so there is always a trustworthy length to compare against.",
      button: "Show the crash",
      className: "story-arrived"
    },
    {
      step: "Scene 2 of 4",
      title: "The master survives. The work poles do not.",
      text: "A couple of flamin’ galahs and one badly aimed party guest hit the lower rack. The three work poles crack into pieces, but the untouched master still proves their full length was 12 inches.",
      button: "Inspect the broken poles",
      className: "story-crashed"
    },
    {
      step: "Scene 3 of 4",
      title: "Some length tags are missing.",
      text: "The 6-inch and 4-inch tags survived. The other tags are gone. Question marks show the pieces whose lengths must be recovered.",
      button: "Name the missing lengths",
      className: "story-inspected"
    },
    {
      step: "Scene 4 of 4",
      title: "Question marks become x, y, and z.",
      text: "A letter is just a reusable name for a missing length. Your job is to make every broken row finish at the same 12-inch line as the master.",
      button: "Start the working puzzle",
      className: "story-labelled"
    }
  ];

  let phase = "primer";
  let solved = { x: null, y: null, z: null };
  let storyScene = 0;
  let selectedValue = null;
  let dragState = null;
  let timers = [];
  let operationToken = 0;

  const wait = (milliseconds) => new Promise((resolve) => {
    const id = window.setTimeout(resolve, reduceMotion ? 0 : milliseconds);
    timers.push(id);
  });

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  function setMessage(kicker, text) {
    messageKicker.textContent = kicker;
    messageText.textContent = text;
  }

  function highlightStep(stepNumber) {
    document.querySelectorAll(".lesson-step").forEach((step, index) => {
      step.classList.toggle("is-active", index === stepNumber - 1);
    });
  }

  function currentVariable() {
    return solveOrder.find((variable) => solved[variable] === null) || null;
  }

  function updateTargets() {
    const current = currentVariable();
    slots.forEach((slot) => {
      const shouldTarget = phase === "solve" && slot.dataset.variable === current && !slot.classList.contains("is-solved");
      slot.classList.toggle("is-target", shouldTarget);
    });
  }

  function updateReadout() {
    const value = (key) => solved[key] === null ? "?" : solved[key];
    variableReadout.textContent = `x = ${value("x")} · y = ${value("y")} · z = ${value("z")}`;
  }

  function clearSelection() {
    selectedValue = null;
    choices.forEach((choice) => {
      choice.classList.remove("is-selected");
      choice.setAttribute("aria-pressed", "false");
    });
  }

  function selectChoice(choice) {
    const value = Number(choice.dataset.value);
    if (selectedValue === value) {
      clearSelection();
      return;
    }
    selectedValue = value;
    choices.forEach((item) => {
      const isSelected = item === choice;
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });
    const current = currentVariable();
    if (current) {
      setMessage("Test the cut", `Now tap the glowing ${current} gap to see whether ${value} inches fits.`);
    }
  }

  function clearPuzzleState() {
    solved = { x: null, y: null, z: null };
    clearSelection();
    seamTheatre.classList.remove("is-fused");
    seamTheatre.setAttribute("aria-hidden", "true");
    slots.forEach((slot) => {
      slot.classList.remove("is-solved", "is-target", "is-wrong");
      slot.querySelector(".slot-value").textContent = "?";
      slot.setAttribute("aria-label", `Unknown ${slot.dataset.variable} slot`);
    });
    actionButton.hidden = true;
    actionButton.textContent = "Prove it across the seam";
    updateReadout();
  }

  function stopDragging() {
    if (!dragState) return;
    dragState.ghost.remove();
    dragState = null;
  }

  function unlockStoryButton(delay) {
    storyNextButton.disabled = true;
    const id = window.setTimeout(() => {
      if (phase === "story") storyNextButton.disabled = false;
    }, reduceMotion ? 0 : delay);
    timers.push(id);
  }

  function showStoryScene(index) {
    storyScene = index;
    const scene = storyScenes[index];
    storyStep.textContent = scene.step;
    storyTitle.textContent = scene.title;
    storyText.textContent = scene.text;
    storyNextButton.textContent = scene.button;
    workshop.classList.add(scene.className);
    highlightStep(index === 0 ? 1 : 2);
    unlockStoryButton(index === 1 ? 1450 : 900);
  }

  function replayStory() {
    clearTimers();
    operationToken += 1;
    stopDragging();
    clearPuzzleState();
    phase = "story";
    storyScene = 0;
    workshop.className = "workshop";
    storyTheatre.setAttribute("aria-hidden", "false");
    resetButton.disabled = true;
    setMessage("Story first", "The interactive bench will unlock after the four-part setup.");
    void workshop.offsetWidth;
    showStoryScene(0);
  }

  function advanceStory() {
    if (phase !== "story" || storyNextButton.disabled) return;
    if (storyScene < storyScenes.length - 1) {
      showStoryScene(storyScene + 1);
      return;
    }
    beginPuzzle();
  }

  function beginPuzzle() {
    clearTimers();
    operationToken += 1;
    phase = "solve";
    workshop.classList.add("is-built", "story-complete");
    storyTheatre.setAttribute("aria-hidden", "true");
    resetButton.disabled = false;
    setMessage("Your job", "Start with Row 1. Which test cut makes 6 + x reach 12 inches?");
    highlightStep(3);
    updateTargets();
  }

  function resetPuzzle() {
    clearTimers();
    operationToken += 1;
    stopDragging();
    clearPuzzleState();
    phase = "solve";
    workshop.className = "workshop is-built story-complete";
    storyTheatre.setAttribute("aria-hidden", "true");
    resetButton.disabled = false;
    setMessage("Your job", "Start with Row 1. Which test cut makes 6 + x reach 12 inches?");
    highlightStep(3);
    updateTargets();
  }

  function flashWrong(slot, value, variable) {
    slot.classList.remove("is-wrong");
    void slot.offsetWidth;
    slot.classList.add("is-wrong");
    setMessage("Not flush", `${value} inches does not fill ${variable}. Compare its length with the gap and try again.`);
    window.setTimeout(() => slot.classList.remove("is-wrong"), reduceMotion ? 0 : 450);
  }

  function flyPiece(sourceRect, target, value) {
    if (reduceMotion) return Promise.resolve();
    const targetRect = target.getBoundingClientRect();
    const flying = document.createElement("div");
    flying.className = "fly-piece";
    flying.textContent = `${value} in`;
    Object.assign(flying.style, {
      left: `${sourceRect.left}px`,
      top: `${sourceRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`
    });
    document.body.appendChild(flying);
    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const scaleX = targetRect.width / sourceRect.width;
    const scaleY = targetRect.height / sourceRect.height;
    const animation = flying.animate([
      { transform: "translate(0, 0) scale(1)", offset: 0 },
      { transform: `translate(${dx * .48}px, ${dy * .2 - 34}px) scale(${(1 + scaleX) / 2}, 1.08)`, offset: .48 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`, offset: 1 }
    ], { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    return animation.finished.catch(() => {}).then(() => flying.remove());
  }

  async function solveVariable(variable, value, sourceElement, chosenSlot) {
    if (phase !== "solve") return;
    const expectedVariable = currentVariable();
    if (variable !== expectedVariable) {
      chosenSlot.classList.remove("is-wrong");
      void chosenSlot.offsetWidth;
      chosenSlot.classList.add("is-wrong");
      setMessage("One row at a time", `Use the current row to solve ${expectedVariable} first.`);
      return;
    }
    if (value !== answers[variable]) {
      flashWrong(chosenSlot, value, variable);
      return;
    }

    phase = "animating";
    const token = operationToken;
    updateTargets();
    const sourceRect = sourceElement.getBoundingClientRect();
    const matchingSlots = slots.filter((slot) => slot.dataset.variable === variable);
    for (const slot of matchingSlots) {
      await flyPiece(sourceRect, slot, value);
      if (token !== operationToken) return;
      slot.querySelector(".slot-value").textContent = `${value} in`;
      slot.classList.add("is-solved");
      slot.setAttribute("aria-label", `${variable} equals ${value} inches`);
      await wait(90);
      if (token !== operationToken) return;
    }
    solved[variable] = value;
    updateReadout();
    clearSelection();
    phase = "solve";

    if (variable === "x") {
      setMessage("x locked in", "6 + 6 reaches 12. The other x is the same piece length, so Row 3 now reads 4 + 6 + z.");
      highlightStep(4);
    } else if (variable === "z") {
      setMessage("z fills the last gap", "4 + 6 + 2 reaches 12. Now split Row 2 into three equal y cuts.");
      highlightStep(4);
    } else {
      setMessage("All three rows are flush", "x = 6, y = 4, z = 2. Every stack contains exactly 12 inches of timber.");
      actionButton.hidden = false;
      highlightStep(5);
    }
    updateTargets();
  }

  function slotAttempt(slot, sourceElement) {
    if (selectedValue === null) {
      const current = currentVariable();
      setMessage("Pick a test cut", `Choose 6, 4, or 2 inches, then place it into the glowing ${current} gap.`);
      return;
    }
    solveVariable(slot.dataset.variable, selectedValue, sourceElement, slot);
  }

  function pointerDown(event, choice) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    selectChoice(choice);
    const rect = choice.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.textContent = `${choice.dataset.value} in`;
    Object.assign(ghost.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    document.body.appendChild(ghost);
    dragState = { pointerId: event.pointerId, choice, ghost, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false, startX: event.clientX, startY: event.clientY };
    choice.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (distance > 5) dragState.moved = true;
    dragState.ghost.style.left = `${event.clientX - dragState.offsetX}px`;
    dragState.ghost.style.top = `${event.clientY - dragState.offsetY}px`;
  }

  function pointerUp(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const { choice, ghost, moved } = dragState;
    ghost.remove();
    dragState = null;
    if (!moved) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".target-slot");
    if (target) {
      selectedValue = Number(choice.dataset.value);
      slotAttempt(target, choice);
    } else {
      setMessage("Back on the tray", "Drop the test cut directly onto the glowing lettered gap.");
    }
  }

  async function showSeam() {
    if (phase !== "solve" || currentVariable() !== null) return;
    phase = "seam";
    workshop.classList.add("is-seam-open");
    seamTheatre.setAttribute("aria-hidden", "false");
    actionButton.textContent = "Fuse the pieces into 12";
    setMessage("The seam", "The solved pieces and the master beam are equal arrangements of the same length.");
    await wait(700);
  }

  function toggleFuse() {
    const isFused = seamTheatre.classList.toggle("is-fused");
    if (isFused) {
      seamCaption.textContent = "The two 6-inch pieces slide together: 6 + 6 becomes one 12-inch beam.";
      actionButton.textContent = "Unpack 12 back into 6 + 6";
    } else {
      seamCaption.textContent = "The 12-inch beam unpacks back into two 6-inch pieces. Nothing was lost.";
      actionButton.textContent = "Fuse the pieces into 12";
    }
  }

  primerButton.addEventListener("click", () => {
    puzzleCard.hidden = false;
    lessonText.hidden = false;
    replayStory();
    window.requestAnimationFrame(() => {
      puzzleCard.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });
  storyNextButton.addEventListener("click", advanceStory);
  replayButton.addEventListener("click", () => {
    replayStory();
    puzzleCard.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
  resetButton.addEventListener("click", () => {
    if (phase === "story") replayStory();
    else resetPuzzle();
  });
  actionButton.addEventListener("click", () => {
    if (phase === "solve") showSeam();
    else if (phase === "seam") toggleFuse();
  });

  choices.forEach((choice) => {
    choice.setAttribute("aria-pressed", "false");
    choice.addEventListener("click", (event) => {
      if (event.detail === 0) selectChoice(choice);
    });
    choice.addEventListener("pointerdown", (event) => pointerDown(event, choice));
    choice.addEventListener("pointermove", pointerMove);
    choice.addEventListener("pointerup", pointerUp);
    choice.addEventListener("pointercancel", pointerUp);
  });

  slots.forEach((slot) => {
    slot.addEventListener("click", () => {
      const source = choices.find((choice) => Number(choice.dataset.value) === selectedValue) || choices[0];
      slotAttempt(slot, source);
    });
  });

  clearPuzzleState();
  highlightStep(1);
})();
