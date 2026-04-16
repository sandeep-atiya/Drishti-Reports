import { Model, DataTypes } from 'sequelize';
import { getMSSQLSequelize } from '../../connections/index.js';

class AdminAuthentication extends Model {}

AdminAuthentication.init(
  {
    ID:               { type: DataTypes.BIGINT,       primaryKey: true, autoIncrement: true },
    AUserName:        { type: DataTypes.STRING(20),   allowNull: false },
    APassword:        { type: DataTypes.STRING(100),  allowNull: false },
    ContactNumber:    { type: DataTypes.STRING(10),   allowNull: true },
    EmailID:          { type: DataTypes.STRING(50),   allowNull: false },
    LastLoginDate:    { type: DataTypes.DATEONLY,     allowNull: true },
    LastLoginTime:    { type: DataTypes.TIME,         allowNull: true },
    OnlyView:         { type: DataTypes.STRING(1000), allowNull: true },
    CanDownload:      { type: DataTypes.STRING(1000), allowNull: true },
    CanEdit:          { type: DataTypes.STRING(1000), allowNull: true },
    StatusID:         { type: DataTypes.INTEGER,      allowNull: false },
    UserTypeID:       { type: DataTypes.INTEGER,      allowNull: false },
    ActiveStatus:     { type: DataTypes.INTEGER,      allowNull: false },
    CreatedByID:      { type: DataTypes.INTEGER,      allowNull: false },
    CreatedDate:      { type: DataTypes.DATEONLY,     allowNull: true },
    CreatedTime:      { type: DataTypes.TIME,         allowNull: true },
    UpdatedDate:      { type: DataTypes.DATEONLY,     allowNull: true },
    UpdatedTime:      { type: DataTypes.TIME,         allowNull: true },
    FullName:         { type: DataTypes.STRING(50),   allowNull: true },
    MachineIPAddress: { type: DataTypes.STRING(30),   allowNull: true },
    MachineName:      { type: DataTypes.STRING(100),  allowNull: true },
    HostName:         { type: DataTypes.STRING(50),   allowNull: true },
    MAC:              { type: DataTypes.STRING(50),   allowNull: true },
    IP4:              { type: DataTypes.STRING(20),   allowNull: true },
    JobStatus:        { type: DataTypes.INTEGER,      allowNull: true },
    JobStatusUpdate:  { type: DataTypes.INTEGER,      allowNull: true },
  },
  {
    sequelize:  getMSSQLSequelize(),
    tableName:  'AdminAuthentication',
    schema:     'dbo',
    timestamps: false,
  },
);

export default AdminAuthentication;
