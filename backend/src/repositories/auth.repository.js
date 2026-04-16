import { Op }              from 'sequelize';
import AdminAuthentication from '../models/mssql/adminAuthentication.model.js';

export async function findUserByLogin(login) {
  return AdminAuthentication.findOne({
    where: {
      [Op.or]: [
        { AUserName: login },
        { EmailID:   login },
      ],
      StatusID: 1,
    },
  });
}

export async function updateLastLogin(id) {
  const now = new Date();
  return AdminAuthentication.update(
    {
      LastLoginDate: now.toISOString().split('T')[0],
      LastLoginTime: now.toTimeString().split(' ')[0],
    },
    { where: { ID: id } },
  );
}
