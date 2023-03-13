"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Appointment.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }
    static allAppointments(userId) {
      return this.findAll({
        where: {
          userId,
        },
        order: [["id", "ASC"]],
      });
    }
    static checkSlot({ start, end }) {
      return this.findOne({
        where: {
          start,
          end,
        },
      });
    }
    static findAppointment({ id, userId }) {
      return this.findOne({
        where: {
          id,
          userId,
        },
      });
    }
    static findAppointmentWithId(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }
    static deleteAppointment(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
    static async updateAppointment(appointmentName, id) {
      return this.update(
        {
          appointmentName: appointmentName,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static addAppointment({ appointmentName, userId, start, end }) {
      return this.create({
        appointmentName,
        userId,
        start,
        end,
      });
    }
    static allTimes(userId) {
      return this.findAll({
        where: userId,
        attributes: ["start", "end"],
      });
    }
  }
  Appointment.init(
    {
      appointmentName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
          len: 5,
        },
      },
      start: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
      end: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
    },
    {
      sequelize,
      modelName: "Appointment",
    }
  );
  return Appointment;
};
