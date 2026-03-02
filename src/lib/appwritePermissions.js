import { Permission, Role } from 'appwrite';

const managerAndAdminPermissions = () => [
  Permission.read(Role.label('admin')),
  Permission.update(Role.label('admin')),
  Permission.delete(Role.label('admin')),
  Permission.read(Role.label('manager')),
  Permission.update(Role.label('manager')),
];

export const buildPermissionsForDoc = ({ type, ownerUserId, clientUserId, sharedWithClient = false }) => {
  switch (type) {
    case 'compliance_uploads': {
      const permissions = [
        Permission.read(Role.user(ownerUserId)),
        Permission.update(Role.user(ownerUserId)),
        Permission.delete(Role.user(ownerUserId)),
        ...managerAndAdminPermissions(),
      ];

      if (sharedWithClient && clientUserId) {
        permissions.push(Permission.read(Role.user(clientUserId)));
      }

      return permissions;
    }

    case 'staff_compliance':
      return [
        Permission.read(Role.user(ownerUserId)),
        Permission.update(Role.user(ownerUserId)),
        Permission.delete(Role.user(ownerUserId)),
        ...managerAndAdminPermissions(),
      ];

    case 'staff_grades':
      return [
        Permission.read(Role.user(ownerUserId)),
        Permission.update(Role.user(ownerUserId)),
        Permission.read(Role.label('admin')),
        Permission.update(Role.label('admin')),
        Permission.delete(Role.label('admin')),
        Permission.read(Role.label('manager')),
      ];

    case 'admin_grading':
      return [
        Permission.read(Role.label('admin')),
        Permission.update(Role.label('admin')),
        Permission.delete(Role.label('admin')),
      ];

    default:
      return [
        Permission.read(Role.user(ownerUserId)),
        Permission.update(Role.user(ownerUserId)),
      ];
  }
};
