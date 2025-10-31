function showNote(data) {
  buttons.forEach(btn => (btn.disabled = true));
  const note = root.querySelector(".md-feedback__note [data-md-value='" + data + "']");
  if (note) {
    note.hidden = false;
  } else {
    // fallback inline message
    let msg = root.querySelector('#feedback-inline-note');
    if (!msg) {
      msg = document.createElement('p');
      msg.id = 'feedback-inline-note';
      msg.style.marginTop = '0.75rem';
      root.appendChild(msg);
    }
    msg.textContent = data === 'helpful'
      ? 'Thanks for the feedback!'
      : 'Thanks — this helps me make it better.';
  }
}