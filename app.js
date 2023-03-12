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
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
const path = require("path");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
const flash = require("connect-flash");
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
    response.render("tasks");
  }
);
// eslint-disable-next-line no-undef
module.exports = app;
