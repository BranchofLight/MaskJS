// TODO: Ordered by priority
// - Allow multiple/adjacent repeat groups -> as of now, it would be considered invalid to have '?#??X?' IN PROGRESS
// - Write unit testing suite
// - Solve 'deleting any character other than last' problem (force to last position or allow and solve)
// - Allow 'Delete' button
// - Allow tabs for changing focus
// - Think about whether or not literals should be typed (probably not, maybe only for mask_placeholders?)
// - mask_placeholder
// - focuslost post mask
// - End mask event (thrown when mask has been completed -> may not always fire if repeater)
// - optional group, one-or-more group
// - Implement escape character
// TODO: Finished
// - Block if end of mask is non-repetitive DONE
// - Delete into a previous repeat group DONE

var DEBUG = true;

// ? used to group a repeating part (eg. $?#?)
var rep_char = '?';
var alpha_char = 'X';
var num_char = '#';
var white_char = '_';
var escape_char = '\\'; // Not implemented, semi-considered in code
var back_char = "Backspace";

// Options Object
// html_placeholder : adds a placeholder attribute to the input on the DOM
// mask_placeholder : adds a mask seen as the user types in the input field
// min              : the minimum amount of characters required otherwise default will replace the input value
// default          : the replacement if input loses focusses before the min number of characters is reached
// keydown          : a function to be called on keydown
// keyup            : a function to be called on keyup

if (!DEBUG) {
	document.getElementById('mask').remove();
}

var mask = function(input, in_mask, options) {
	// Holds the place in the input mask
  var mask_cursor = 0;
	// Used to find how long each repeat group is
	// Holds objects. {start: index, end: index, length}
	var groups = [];

	// Checks if c is a special character
  var isSpecialChar = function(c, next) {
    return ((next !== escape_char) && (c === rep_char || c === alpha_char ||
           c === white_char || c === num_char || c === escape_char));
  };

	// Shorthand
	var isCursorSpecial = function() {
		return isSpecialChar(in_mask[mask_cursor], in_mask[mask_cursor+1]);
	};

	// Peeks behind the cursor
	var peekBack = function(peek) {
		peek = (peek) ? peek : 1;
		return in_mask[mask_cursor-peek];
	};

	if (DEBUG) {
		for (let i = 0; i < in_mask.length; i++) {
			if (i === 0) {
				document.getElementById('mask').innerHTML += '<span class="active '+i+'">'+in_mask[i]+'</span>';
			} else {
				document.getElementById('mask').innerHTML += '<span class="'+i+'">'+in_mask[i]+'</span>';
			}
		}

		document.getElementById('mask').innerHTML += '<span class="'+in_mask.length+'"> END</span>';
	}
	// Checks in_mask for validity
	// Throws error if invalid.
	var validate = function() {
		var group = [];
		var add = false;
		var num_repeats = 0;
		for (let i = 0; i < in_mask.length; i++) {
			if (add && !(in_mask[i] === rep_char && in_mask[i+1] !== escape_char)) {
				group.push(in_mask[i]);
			}

			if (in_mask[i] === rep_char && in_mask[i+1] !== escape_char) {
				num_repeats += 1;
				if (add) {
					// Group is finished
					if (group.indexOf(in_mask[i+1]) > -1) {
						// The character after this group exists in this group
						// This would confuse the listeners!
						// (Do we continue in the current group or go to the next one?)
						// Ex. of invalid mask -> ?X,_?X -> alpha first in second group and in first group
						throw "InvalidMaskError: '" + in_mask[i+1] + "' cannot start second group.";
					}
				}
				add = !add;
			}

			if (in_mask[i] === rep_char && in_mask[i+1] === rep_char) {
				// Cannot have an empty repeat group
				throw "InvalidMaskError: group at ["+i+"] is an empty repeat group.";
			}
		}

		if (num_repeats%2 !== 0) {
			// Cannot have an odd number of repeat characters
			// Indicates a missing close character
			throw "InvalidMaskError: " + "odd number of repeat group characters.";
		}
	}();

	// Finds starting, non-deletable, literals
	var findStartingLiterals = function() {
		if (!isCursorSpecial()) {
			options.last_start_literal = 0;
			for (let i = 0; i < in_mask.length; i++) {
				if (!isSpecialChar(in_mask[i], in_mask[i+1])) {
					options.last_start_literal = i;
				} else {
					break;
				}
			}
		}
	}();

	// Initializes groups. Used to determine where cursor is for movement
	// inside input field.
	var initGroups = function() {
		for (let i = 0; i < in_mask.length; i++) {
			if (in_mask[i] === rep_char) {
				// If the latest group has had a start initialized but not an end
				if (groups.length && groups[groups.length-1].start !== undefined && groups[groups.length-1].end === undefined) {
					groups[groups.length-1].end    = i;
					groups[groups.length-1].length = 0;
				} else {
					groups.push({start: i});
				}
			}
		}
	}();

	// Returns the current group, if any, the cursor currently belongs to
	// Counts as within group if on the beginning or end characters of a group
	// Returns undefined if not inside a group
	var getCurrentGroup = function() {
		for (let i = 0; i < groups.length; i++) {
			if (mask_cursor >= groups[i].start && mask_cursor <= groups[i].end) {
				return groups[i];
			}
		}

		return undefined;
	};

	if (options) {
  	if (options.html_placeholder) {
    	input.placeholder = options.html_placeholder;
    }
  }

	// Increases the cursor's position
	var advanceCursor = function(inc) {
		if (DEBUG) {
			document.getElementsByClassName('active')[0].classList.remove('active');
		}
		mask_cursor += (inc) ? inc : 1;
		if (DEBUG) {
			document.getElementsByClassName(mask_cursor)[0].classList.add("active");
		}
		checkGroups();
	};

	// Move cursor back by dec / 1
	var backCursor = function(dec) {
		if (DEBUG) {
			document.getElementsByClassName('active')[0].classList.remove('active');
		}
		mask_cursor -= (dec) ? dec : 1;
		if (DEBUG) {
			document.getElementsByClassName(mask_cursor)[0].classList.add("active");
		}
	};

	// Move cursor to location
	var setCursor = function(cursor) {
		if (DEBUG) {
			document.getElementsByClassName('active')[0].classList.remove('active');
		}
		mask_cursor = cursor;
		if (DEBUG) {
			document.getElementsByClassName(cursor)[0].classList.add("active");
		}
	};

	// Will handle start/end repeat characters on cursor move.
	// Call on every cursor move.
	var checkGroups = function() {
		if (in_mask[mask_cursor] === rep_char) {
			console.log("Repeat character");
			// Must be explicit undefined check as 0 may be a repeat_start value
			if (options.repeat_start !== undefined) {
				if (DEBUG) {
					document.getElementsByClassName('active')[0].classList.remove('active');
				}
				// Inside repeat group, spotted end, set cursor to beginning of group
				mask_cursor = options.repeat_start;
				if (DEBUG) {
					document.getElementsByClassName(options.repeat_start)[0].classList.add("active");
				}
			} else {
				// Found start of group
				options.repeat_start  = mask_cursor;
				options.repeat_end    = in_mask.indexOf(rep_char, mask_cursor+1);
				options.group_trigger = in_mask[options.repeat_end+1];
			}
			advanceCursor();
		}
	};

	// On backspace, call this to set group.
	// Once set, checkGroups() handles functionality.
	// NOTE: This assumes that cursor is moving into a new group and is at end.
	//       It only guarantees expected functionality if cursor is supposed to
	//       be in a group. If it is not, this may set an incorrect group.
	var backGroupSearch = function() {
		if (in_mask[mask_cursor] === rep_char) {
			options.repeat_end    = mask_cursor;
			options.group_trigger = in_mask[mask_cursor+1]; // NOTE: This will not work if next is a new repeat group
			for (let i = mask_cursor-1; i >= 0; i--) {
				if (in_mask[i] === rep_char) {
					// Found start point
					options.repeat_start = i;
					break;
				}
			}
		}
	};

  // The core functionality for the masking
  var keydown_listener = function(e) {
		console.log("Down [" + mask_cursor + "]: " + in_mask[mask_cursor]);

    var valid = false;

    switch (in_mask[mask_cursor]) {
      // case alpha_char:
      //   console.log("Alpha character");
      //   break;
      // case white_char:
      //   console.log("Whitespace character");
      //   break;
      case num_char:
        // console.log("Number character");
        if (e.key >= "0" && e.key <= "9") {
          valid = true;
        }
        break;
      // case escape_char:
      //   console.log("Escape character");
      //   break;
    }

		// Cursor literal is being typed
		if (!isCursorSpecial() && e.key === in_mask[mask_cursor]) {
			valid = true;
		}

		if (mask_cursor > in_mask.length-1 && e.key !== back_char) {
			// End of mask
			e.preventDefault();
		} else if (valid) {
			// Typical character input. Does not count triggers.
			if (getCurrentGroup()) {
				getCurrentGroup().length += 1;
			}
      advanceCursor();
    } else if (e.key === back_char) {
			// Backspace
      if (mask_cursor > 0) {
				if (peekBack() !== rep_char) {
					backCursor();
					if (peekBack() === rep_char && mask_cursor-1 !== options.repeat_start) {
						backCursor();
						backGroupSearch();
						backCursor();
					}
				} else {
					var deleteGroup = undefined;
					if (getCurrentGroup() && getCurrentGroup().length > 0) {
						// Repeat group not over.
						deleteGroup = getCurrentGroup();
						setCursor(options.repeat_end-1);
					} else if (options.last_start_literal+1 >= input.value.length-1) {
						// Prevents starting literal deletion
						// +1 to convert index to length
						// -1 to assume backspace
						e.preventDefault();
					} else if (getCurrentGroup()) {
						// peekBack char is repeat, check if character before that is as well
						if (peekBack(2) !== rep_char && getCurrentGroup().length === 0) {
							// Character before start is a non-repeat character / non-starting literal.
							// Move back once onto start of group and again to pass it.
							deleteGroup = getCurrentGroup();
							backCursor(2);
							if (peekBack() === rep_char) {
								// The character being deleted leads into a group
								backCursor();
								backGroupSearch();
								backCursor();
							}
						} else {
							// Current repeat group is empty and another group exists right behind
						}
					} else {
						// No current group but character before is end of group
						backCursor();
						backGroupSearch();
						backCursor();
					}
				}
				if (deleteGroup) {
					deleteGroup.length -= (deleteGroup.length === 0) ? 0 : 1;
				}
      }
    } else if (e.key === options.group_trigger) {
			setCursor(options.repeat_end+2);
			options.group_trigger = undefined;
			options.repeat_start = undefined;
			options.repeat_end = undefined;
			checkGroups();
		} else if (!valid && e.key !== back_char) {
			// Invalid input
      e.preventDefault();
    }
  };

  // Adds any literals to beginning of input
  var focus_listener = function(e) {
    if (input.value.length < options.last_start_literal+1) {
			input.value = "";
			for (let i = 0; i < options.last_start_literal+1; i++) {
				input.value += in_mask[i];
				advanceCursor();
			}
		} else {
			// If no starting literals, may still start with a repeat group
			checkGroups();
		}
  };

  // Sets input to default if focus is lost before valid input
  var focus_lost_listener = function(e) {
    if (options.min > 0 && e.target.value.length < options.min && e.target.value.length > 0) {
      e.target.value = options.default;
    }
  };

  input.addEventListener("keydown", keydown_listener);
  input.addEventListener("focusin", focus_listener);
  input.addEventListener("focusout", focus_lost_listener);
};

mask(document.getElementById('money'), "$?#?.##", {
  html_placeholder: "$0.00",
	mask_placeholder: "$?_?.__",
	min: 2,
	default: "$0.00",
});
