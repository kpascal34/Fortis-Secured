#!/usr/bin/env node

/**
 * Stage 3 tenancy smoke checks.
 * This validates Model A access rules with deterministic fixtures.
 */

const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  MANAGER: 'manager',
  STAFF: 'staff',
};

const RESOURCE_TYPES = {
  SITES: 'sites',
  STAFF_COMPLIANCE: 'staff_compliance',
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const assertScopedAccess = (resourceType, doc, scope) => {
  if (!scope?.role) {
    throw new Error('scope.role is required');
  }

  if (scope.role === ROLES.ADMIN) {
    return true;
  }

  if (scope.role === ROLES.CLIENT) {
    if (String(doc.clientId || '') !== String(scope.clientId || '')) {
      throw new Error('Client scope violation');
    }
    return true;
  }

  if (scope.role === ROLES.MANAGER) {
    const siteMatch = asArray(scope.assignedSiteIds).includes(doc.siteId);
    const clientMatch = asArray(scope.assignedClientIds).includes(doc.clientId);
    if (!siteMatch && !clientMatch) {
      throw new Error('Manager scope violation');
    }
    return true;
  }

  if (scope.role === ROLES.STAFF) {
    if (resourceType === RESOURCE_TYPES.STAFF_COMPLIANCE) {
      if (String(doc.staffId || '') !== String(scope.userId || '')) {
        throw new Error('Staff ownership violation');
      }
      return true;
    }

    throw new Error('Staff has no access to this resource');
  }

  throw new Error(`Unknown role: ${scope.role}`);
};

const checks = [
  {
    id: 'CLIENT_SITE_ISOLATION',
    description: 'CLIENT cannot query sites where clientId != own',
    run: () => {
      const scope = { role: ROLES.CLIENT, userId: 'client-user-1', clientId: 'client-a' };
      const foreignSite = { $id: 'site-b', clientId: 'client-b', siteId: 'site-b' };
      let blocked = false;
      try {
        assertScopedAccess(RESOURCE_TYPES.SITES, foreignSite, scope);
      } catch (_) {
        blocked = true;
      }

      if (!blocked) {
        throw new Error('Client was able to access foreign site');
      }
    },
  },
  {
    id: 'STAFF_COMPLIANCE_ISOLATION',
    description: 'STAFF cannot fetch another staff compliance doc',
    run: () => {
      const scope = { role: ROLES.STAFF, userId: 'staff-a' };
      const doc = { $id: 'comp-b', staffId: 'staff-b', clientId: 'client-a', siteId: 'site-a' };
      let blocked = false;
      try {
        assertScopedAccess(RESOURCE_TYPES.STAFF_COMPLIANCE, doc, scope);
      } catch (_) {
        blocked = true;
      }

      if (!blocked) {
        throw new Error('Staff was able to access another staff compliance record');
      }
    },
  },
  {
    id: 'MANAGER_SITE_ASSIGNMENT_ENFORCED',
    description: 'MANAGER with assignedSiteIds cannot access unassigned sites',
    run: () => {
      const scope = {
        role: ROLES.MANAGER,
        userId: 'manager-1',
        assignedSiteIds: ['site-1', 'site-2'],
        assignedClientIds: ['client-a'],
      };
      const doc = { $id: 'site-x', siteId: 'site-x', clientId: 'client-z' };

      let blocked = false;
      try {
        assertScopedAccess(RESOURCE_TYPES.SITES, doc, scope);
      } catch (_) {
        blocked = true;
      }

      if (!blocked) {
        throw new Error('Manager was able to access unassigned site/client');
      }
    },
  },
  {
    id: 'ADMIN_GLOBAL_ACCESS',
    description: 'ADMIN can access all records',
    run: () => {
      const scope = { role: ROLES.ADMIN, userId: 'admin-1' };
      assertScopedAccess(RESOURCE_TYPES.SITES, { $id: 'site-any', siteId: 'site-any', clientId: 'client-any' }, scope);
      assertScopedAccess(
        RESOURCE_TYPES.STAFF_COMPLIANCE,
        { $id: 'comp-any', staffId: 'staff-any', clientId: 'client-any', siteId: 'site-any' },
        scope
      );
    },
  },
];

const results = [];

for (const check of checks) {
  const started = Date.now();
  try {
    await Promise.resolve(check.run());
    results.push({ id: check.id, description: check.description, status: 'PASS', ms: Date.now() - started });
  } catch (error) {
    results.push({
      id: check.id,
      description: check.description,
      status: 'FAIL',
      ms: Date.now() - started,
      error: error.message || String(error),
    });
  }
}

console.log('\nTenancy Smoke Results');
console.table(results.map((item) => ({ id: item.id, status: item.status, ms: item.ms, description: item.description })));

const failed = results.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error('\nFailures:');
  for (const item of failed) {
    console.error(`- ${item.id}: ${item.error}`);
  }
  process.exit(1);
}

console.log('\nAll tenancy smoke checks passed.');
