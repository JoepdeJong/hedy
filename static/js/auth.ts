import { modal } from './modal';
import { join_class } from './teachers';
import {saveitP, showAchievements} from './app';

// *** Utility functions ***

interface Dict<T> {
    [key: string]: T;
}

function convertFormJSON(form: JQuery<HTMLElement>) {
  let result : Dict<any> = {};
  $.each($(form).serializeArray(), function() {
    if (result[this.name]) {
      // If this value already exists it's most likely a check button: store all selected ones in an Array
      if ($.isArray(result[<string>this.name])) {
        result[this.name] = $.merge(result[this.name], Array(this.value));
      } else {
        result[this.name] = $.merge(Array(result[this.name]), Array(this.value));
      }
    } else {
      // Only add the current field to the JSON object if it actually contains a value
      if ((this.value)) {
        result[this.name] = this.value;
      }
    }
  });
  return JSON.stringify(result);
}

function redirect(where: string) {
  where = '/' + where;
  window.location.pathname = where;
}

// *** User POST without data ***

export function logout() {
  $.ajax ({
    type: 'POST',
    url: '/auth/logout'
  }).done (function () {
    redirect('login');
  });
}

// Todo TB: It might be nice to get a confirmation pop-up from the server instead with some secret key
// As with the current flow one can destroy an account by "accidentally" making an empty POST to /auth/destroy
export function destroy(confirmation: string) {
  modal.confirm (confirmation, function () {
    $.ajax ({
      type: 'POST',
      url: '/auth/destroy'
    }).done (function () {
      redirect('');
    });
  });
}

export function destroy_public(confirmation: string) {
  modal.confirm (confirmation, function () {
    $.ajax ({
      type: 'POST',
      url: '/auth/destroy_public'
    }).done (function () {
      redirect ('my-profile');
    });
  });
}

// *** User forms ***

$('form#signup').submit(function(e) {
  e.preventDefault();
  $.ajax ({
        type: 'POST',
        url: '/auth/signup',
        // This should do the magic to convert to a correct JSON object
        data: convertFormJSON($(this)),
        contentType: 'application/json; charset=utf-8'
      }).done (function () {
        afterLogin({"first_time": true});
      }).fail (function (response) {
        modal.alert(response.responseText, 3000, true);
      });
});

$('form#login').submit(function(e) {
  e.preventDefault();
  $.ajax ({
    type: 'POST',
    url: '/auth/login',
    data: convertFormJSON($(this)),
    contentType: 'application/json; charset=utf-8'
  }).done (function (response) {
    if (response['first_time']) {
      return afterLogin({"first_time": true});
    }
    return afterLogin({"admin": response['admin'] || false, "teacher": response['teacher']} || false);
  }).fail (function (response) {
    modal.alert(response.responseText, 3000, true);
  });
});

$('form#profile').submit(function(e) {
  e.preventDefault();
  $.ajax ({
    type: 'POST', url: '/profile',
    data: convertFormJSON($(this)),
    contentType: 'application/json; charset=utf-8'
  }).done (function (response) {
    if (response.reload) {
      modal.alert(response.message, 2000, false);
      setTimeout (function () {location.reload ()}, 2000);
    } else {
      modal.alert(response.message, 3000, false);
    }
  }).fail (function (response) {
    modal.alert(response.responseText, 3000, true);
  });
});

$('form#change_password').submit(function(e) {
  e.preventDefault();
  $.ajax ({
    type: 'POST',
    url: '/auth/change_password',
    data: convertFormJSON($(this)),
    contentType: 'application/json; charset=utf-8'
  }).done (function (response) {
    modal.alert(response.message, 3000, false);
    $('form#change_password').trigger('reset');
  }).fail (function (response) {
    modal.alert(response.responseText, 3000, true);
  });
});

$('form#recover').submit(function(e) {
  e.preventDefault();
  $.ajax ({
    type: 'POST', url: '/auth/recover',
    data: convertFormJSON($(this)),
    contentType: 'application/json; charset=utf-8'
  }).done (function (response) {
    modal.alert(response.message, 3000, false);
    $('form#recover').trigger('reset');
  }).fail (function (response) {
    modal.alert(response.responseText, 3000, true);
  });
});

$('form#reset').submit(function(e) {
  e.preventDefault();
  $.ajax ({
    type: 'POST', url: '/auth/reset',
    data: convertFormJSON($(this)),
    contentType: 'application/json; charset=utf-8'
  }).done (function (response) {
    modal.alert(response.message, 2000, false);
    $('form#reset').trigger('reset');
    setTimeout(function (){
      redirect ('login');
    }, 2000);
  }).fail (function (response) {
    modal.alert(response.responseText, 3000, true);
  });
});

$('form#public_profile').submit(function(e) {
  e.preventDefault();
  $.ajax ({
    type: 'POST',
    url: '/auth/public_profile',
    data: convertFormJSON($(this)),
    contentType: 'application/json; charset=utf-8'
  }).done (function (response) {
    modal.alert(response.message, 3000, false);
    if (response.achievement) {
      showAchievements(response.achievement, false, "");
    }
    $('#public_profile_redirect').show();
  }).fail (function (response) {
    return modal.alert(response.responseText, 3000, true);
  });
});

// *** Admin functionality ***

export function markAsTeacher(checkbox: any, username: string, is_teacher: boolean) {
  $(checkbox).prop('checked', false);
  let text = "Are you sure you want to remove " + username + " as a teacher?";
  if (is_teacher) {
    text = "Are you sure you want to make " + username + " a teacher?";
  }
  modal.confirm (text, function () {
    $.ajax({
      type: 'POST',
      url: '/admin/markAsTeacher',
      data: JSON.stringify({
        username: username,
        is_teacher: is_teacher
      }),
      contentType: 'application/json; charset=utf-8'
    }).done(function () {
      $(checkbox).prop('checked', true);
      modal.alert(['User', username, 'successfully', is_teacher ? 'marked' : 'unmarked', 'as teacher'].join(' '), 2000, false);
    }).fail(function () {
      modal.alert(['Error when', is_teacher ? 'marking' : 'unmarking', 'user', username, 'as teacher'].join(' '), 2000, false);
    });
  });
}

export function changeUserEmail(username: string, email: string) {
  modal.prompt ('Please enter the corrected email', email, function (correctedEmail) {
    if (correctedEmail === email) return;
    $.ajax ({
      type: 'POST',
      url: '/admin/changeUserEmail',
      data: JSON.stringify ({
        username: username,
        email: correctedEmail
      }),
      contentType: 'application/json; charset=utf-8'
    }).done (function () {
      location.reload ();
    }).fail (function () {
      modal.alert (['Error when changing the email for user', username].join (' '), 2000, true);
    });
  });
}

// *** LOADERS ***

$("#language").change(function () {
    const lang = $(this).val();
    $('#keyword_language').val("en");
    if (lang == "en" || !($('#' + lang + '_option').length)) {
      $('#keyword_lang_container').hide();
    } else {
      $('.keyword_lang_option').hide();
      $('#en_option').show();
      $('#' + lang + '_option').show();
      $('#keyword_lang_container').show();
    }
});

/**
 * After login:
 *
 * - Check if there's a saved program in localstorage. If so, save it.
 * - Check if we were supposed to be joining a class. If so, join it.
 * - Otherwise redirect to "my programs".
 */
async function afterLogin(loginData: Dict<boolean>) {
  const savedProgramString = localStorage.getItem('hedy-first-save');
  const savedProgram = savedProgramString ? JSON.parse(savedProgramString) : undefined;

  if (savedProgram) {
    await saveitP(savedProgram[0], savedProgram[1], savedProgram[2], savedProgram[3], savedProgram[4]);
    localStorage.removeItem('hedy-first-save');
    return redirect('programs');
  }

  const joinClassString = localStorage.getItem('hedy-join');
  const joinClass = joinClassString ? JSON.parse(joinClassString) : undefined;
  if (joinClass) {
    localStorage.removeItem('hedy-join');
    return join_class(joinClass.id, joinClass.name);
  }

  const savedPath = getSavedRedirectPath();
  if (savedPath) {
    return redirect(savedPath);
  }

  // If the user logs in for the first time -> redirect to the landing-page after signup
  if (loginData['first_time']) {
    return redirect('landing-page/1');
  }
  // If the user is an admin -> re-direct to admin page after login
  if (loginData['admin']) {
    return redirect('admin');
  }

  // If the user is a teacher -> re-direct to for-teachers page after login
  if (loginData['teacher']) {
    return redirect('for-teachers');
  }
  // Otherwise, redirect to the programs page
  redirect('landing-page');
}

function getSavedRedirectPath() {
  const redirect = localStorage.getItem('hedy-save-redirect');
  if (redirect) {
    localStorage.removeItem('hedy-save-redirect');
  }
  return redirect;
}
