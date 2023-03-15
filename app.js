/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const { Appointment, User } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var csrf = require("tiny-csrf");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
const path = require("path");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
const flash = require("connect-flash");
const { time } = require("console");
// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "my-secret-super-key-10181810",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch(function () {
          return done(null, false, { message: "Unrecognized Email" });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});
// Home page
app.get("/", async (request, response) => {
  if (request.user) {
    return response.redirect("/tasks");
  } else {
    response.render("index", {
      title: "Appointments Management",
      csrfToken: request.csrfToken(),
    });
  }
});
// Sign up
app.get("/signup", async (request, response) => {
  response.render("signup", {
    title: "Create A New Account",
    csrfToken: request.csrfToken(),
  });
});
app.get("/login", async (request, response) => {
  response.render("login", {
    title: "Sign In",
    csrfToken: request.csrfToken(),
  });
});
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});
app.get("/home", async (request, response) => {
  return response.redirect("/");
});
app.post("/newaccount", async (request, response) => {
  if (request.body.firstName == false) {
    request.flash("error", "Please Enter Your First Name");
    return response.redirect("/signup");
  }
  if (request.body.lastName == false) {
    request.flash("error", "Please Enter Your Last Name");
    return response.redirect("/signup");
  }
  if (request.body.password == false) {
    request.flash("error", "Please Enter Password");
    return response.redirect("/signup");
  }
  if (request.body.password.length < 8) {
    request.flash(
      "error",
      "Password length should be atleast of 8 characters!"
    );
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        response.redirect("/tasks");
      }
    });
  } catch (error) {
    request.flash("error", error.message);
    return response.redirect("/signup");
  }
});
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user);
    response.redirect("/tasks");
  }
);
app.get(
  "/tasks",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const userId = request.user.id;
      const allAppointments = await Appointment.allAppointments(userId);
      const appointmentsCount = allAppointments.length;
      const firstName = request.user.firstName;
      const lastName = request.user.lastName;
      const userName = firstName + " " + lastName;

      if (request.accepts("html")) {
        response.render("tasks", {
          title: "User Appointments",
          allAppointments,
          appointmentsCount,
          userName,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          allAppointments,
          tasksCount,
          userName,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);
app.get(
  "/appointment/new",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("newappointment", {
      title: "New Appointment",
      csrfToken: request.csrfToken(),
    });
  }
);
app.post(
  "/appointments/new",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.appointment.length < 5) {
      request.flash("error", "Length of the Appointment Should be atleast 5");
      return response.redirect("/tasks");
    }
    let startTime = request.body.start;
    let endTime = request.body.end;
    let startSec = new Date(startTime).getTime() / 1000;
    let now = new Date().getTime() / 1000;
    if (startSec < now) {
      request.flash(
        "error",
        "Sorry, You cannot schedule appointments in past time"
      );
      return response.redirect("/tasks");
    }
    if (startTime == false) {
      request.flash("error", "Please choose start time");
      return response.redirect("/tasks");
    }
    if (endTime == false) {
      request.flash("error", "Please choose end time");
      return response.redirect("/tasks");
    }

    if (endTime === startTime) {
      request.flash("error", "Start and End Time cannot be same");
      request.flash("error", "Please Try Again");
      return response.redirect("/tasks");
    }
    if (endTime < startTime) {
      request.flash("error", "End time cannot be before Start time");
      request.flash("error", "Please Try Again");
      return response.redirect("/tasks");
    }
    const userId = request.user.id;
    try {
      let allAppointments = await Appointment.allAppointments(userId);
      const alreadyOccupied = await Appointment.checkSlot({
        start: startTime,
        end: endTime,
      });

      let newStart = request.body.start;
      let newEnd = request.body.end;
      let startSec = new Date(newStart).getTime() / 1000;
      let endSec = new Date(newEnd).getTime() / 1000;
      console.log(startSec + "wekjndjwknenkdj");
      let overlay = false;
      for (let i = 0; i < allAppointments.length; i++) {
        console.log(allAppointments[0].start + "ebkhbdewbk");
        let checkStart = new Date(allAppointments[i].start).getTime() / 1000;
        console.log(checkStart + "hfbhcbdhf");
        let checkEnd = new Date(allAppointments[i].end).getTime() / 1000;
        if (checkStart <= startSec && startSec <= checkEnd) {
          console.log(checkStart, startSec, checkEnd + "jojdiqnd");
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with below mentioned Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        } else if (startSec <= checkEnd && checkEnd <= endSec) {
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with below mentioned Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        } else if (checkStart <= startSec && endSec <= checkEnd) {
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with below mentioned Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        } else if (startSec <= checkStart && endSec >= checkEnd) {
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with below mentioned Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        } else if (startSec <= checkStart && checkEnd >= endSec) {
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with below mentioned Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        }
      }

      if (!alreadyOccupied) {
        const thisAppointment = await Appointment.addAppointment({
          appointmentName: request.body.appointment,
          userId: request.user.id,
          start: request.body.start,
          end: request.body.end,
        });
        return response.redirect("/tasks");
      } else {
        console.log(alreadyOccupied + "shhhhhhhhhhhhhhhhhh");
        request.flash(
          "error",
          "Two Appointments are overlapping,Edit the below appointment"
        );
        request.flash("error", "And Update With New One");
        return response.redirect(`/tasks/${alreadyOccupied.id}`);
      }
    } catch (error) {
      console.log(error);
    }
  }
);
app.get(
  "/tasks/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const appointmentId = request.params.id;
    const overlap = await Appointment.findAppointmentWithId(appointmentId);
    return response.render("overlap", {
      appointmentId,
      appointmentName: overlap.appointmentName,
      start: overlap.start,
      end: overlap.end,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/tasks/:id/",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const userId = request.user.id;
      if (request.body.appointment.length < 5) {
        request.flash("error", "Length of the Appointment Should be atleast 5");
        return response.redirect(`/tasks/${request.params.id}`);
      }
      let startTime = request.body.start;
      let endTime = request.body.end;
      let startSec = new Date(startTime).getTime() / 1000;
      let now = new Date().getTime() / 1000;
      if (startSec < now) {
        request.flash(
          "error",
          "Sorry, You cannot schedule appointments in past time"
        );
        return response.redirect("/tasks");
      }

      if (startTime == false) {
        request.flash("error", "Please choose start time");
        return response.redirect(`/tasks/${request.params.id}`);
      }
      if (endTime == false) {
        request.flash("error", "Please choose end time");
        return response.redirect(`/tasks/${request.params.id}`);
      }
      if (request.body.start > request.body.end) {
        request.flash("error", "End time cannot be before Start time");
        return response.redirect(`/tasks/${request.params.id}`);
      }
      let allAppointments = await Appointment.allAppointments(userId);
      const alreadyOccupied = await Appointment.checkSlot({
        start: startTime,
        end: endTime,
      });

      let newStart = request.body.start;
      let newEnd = request.body.end;
      startSec = new Date(newStart).getTime() / 1000;
      let endSec = new Date(newEnd).getTime() / 1000;
      console.log(startSec + "wekjndjwknenkdj");
      let overlay = false;
      for (let i = 0; i < allAppointments.length; i++) {
        console.log(allAppointments[0].start + "ebkhbdewbk");
        let checkStart = new Date(allAppointments[i].start).getTime() / 1000;
        console.log(checkStart + "hfbhcbdhf");
        let checkEnd = new Date(allAppointments[i].end).getTime() / 1000;
        if (checkStart <= startSec && startSec <= checkEnd) {
          console.log(checkStart, startSec, checkEnd + "jojdiqnd");
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with existing Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        } else if (startSec <= checkEnd && checkEnd <= endSec) {
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with existing Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        } else if (checkStart <= startSec && endSec <= checkEnd) {
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with existing Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        } else if (startSec <= checkStart && endSec >= checkEnd) {
          overlay = true;
          request.flash(
            "error",
            "Entered Appointment is overlapping with existing Appointment"
          );
          return response.redirect(`/tasks/${allAppointments[i].id}`);
        }
      }

      await Appointment.override({
        appointmentName: request.body.appointment,
        start: request.body.start,
        end: request.body.end,
        id: request.params.id,
        userId: userId,
      });
      request.flash("success", "Overrided Succesfully");
      return response.redirect("/tasks");
    } catch (error) {
      console.log(error);
    }
  }
);
app.get(
  "/appointment/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let userId = request.user.id;
    let appointmentId = request.params.id;
    const appointment = await Appointment.findAppointment({
      id: appointmentId,
      userId,
    });
    try {
      if (request.accepts("html")) {
        response.render("editAppointment", {
          appointmentName: appointment.appointmentName,
          id: request.params.id,
          userId: request.user.id,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json(appointment);
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);
app.post(
  "/appointments/:appointmentId/:userId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    {
      console.log(request.params.appointmentId + "hggsggggssssss");
      console.log(request.params.userId + "heduhweohdioh");
      try {
        const updatedAppointment = await Appointment.updateAppointment({
          appointmentName: request.body.appointment,
          id: request.params.appointmentId,
        });
        if (updatedAppointment) {
          return response.redirect("/tasks");
        }
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.delete(
  "/appointments/:id/delete",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    {
      try {
        const appointment = await Appointment.findAppointmentWithId(
          request.params.id
        );
        const deletedAppointment = await Appointment.deleteAppointment(
          request.params.id
        );
        return response.json({ success: deletedAppointment === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.get(
  "/user/passwordReset",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response) => {
    if (request.user) {
      response.render("PasswordReset", {
        csrfToken: request.csrfToken(),
      });
    }
  }
);
app.post(
  "/user/passwordReset",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user) {
      if (!request.body.oldpassword) {
        request.flash("error", "Old Password Field Cannot Be Empty");
        return response.redirect("/user/passwordReset");
      }
      if (!request.body.newpassword) {
        request.flash("error", "New Password Field Cannot Be Empty");
        return response.redirect("/user/passwordReset");
      }
      if (request.body.newpassword.length < 8) {
        request.flash("error", "Password length should be atleast 8");
        return response.redirect("/user/passwordReset");
      }
      const res = await bcrypt.compare(
        request.body.newpassword,
        request.user.password
      );
      if (res) {
        request.flash(
          "error",
          "New password cannot be same as existing password"
        );
        return response.redirect("/user/passwordReset");
      }
      const hashedNewPwd = await bcrypt.hash(
        request.body.newpassword,
        saltRounds
      );
      const result = await bcrypt.compare(
        request.body.oldpassword,
        request.user.password
      );
      if (result) {
        try {
          User.findOne({ where: { email: request.user.email } }).then(
            (user) => {
              user.resetPassword(hashedNewPwd);
            }
          );
          request.flash("success", "Password changed successfully");
          return response.redirect("/tasks");
        } catch (error) {
          console.log(error);
          return response.status(422).json(error);
        }
      } else {
        request.flash("error", "Incorrect Old Password");
        return response.redirect("/user/passwordReset");
      }
    }
  }
);
app.use(function (request, response) {
  response.status(404).render("error");
});
// eslint-disable-next-line no-undef
module.exports = app;
