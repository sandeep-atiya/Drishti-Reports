import { Model, DataTypes } from 'sequelize';
import { getPGSequelize } from '../../connections/index.js';

class Log extends Model {}

Log.init(
  {
    id:         { type: DataTypes.INTEGER,   primaryKey: true, autoIncrement: true },
    level:      { type: DataTypes.STRING,    allowNull: false },
    message:    { type: DataTypes.TEXT,      allowNull: false },
    meta:       { type: DataTypes.JSONB,     allowNull: true },
    created_at: { type: DataTypes.DATE,      allowNull: true },
  },
  {
    sequelize: getPGSequelize(),
    tableName: 'logs',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
  }
);

export default Log;
