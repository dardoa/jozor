import React, { lazy, Suspense } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { useAccessControlState } from './accessControl/useAccessControlState';
import type { AccessControlTabProps } from './accessControl/accessControlTypes';

const ConfirmationModal = lazy(() =>
  import('../../ConfirmationModal').then((module) => ({ default: module.ConfirmationModal }))
);
const AccessCollaboratorsSection = lazy(() =>
  import('./accessControl/AccessCollaboratorsSection').then((module) => ({ default: module.AccessCollaboratorsSection }))
);
const AccessInviteSection = lazy(() =>
  import('./accessControl/AccessInviteSection').then((module) => ({ default: module.AccessInviteSection }))
);
const AccessPendingInvitationsSection = lazy(() =>
  import('./accessControl/AccessPendingInvitationsSection').then((module) => ({ default: module.AccessPendingInvitationsSection }))
);
const AccessShareLinkSection = lazy(() =>
  import('./accessControl/AccessShareLinkSection').then((module) => ({ default: module.AccessShareLinkSection }))
);

export const AccessControlTab: React.FC<AccessControlTabProps> = ({
  treeId,
  ownerId,
  ownerEmail,
}) => {
  const { t } = useTranslation();
  const sectionText = t.adminHub.accessSections;
  const state = useAccessControlState({ treeId, ownerId, ownerEmail, t });
  const revokeAccessLabel = t.treeManager.revokeAccess || 'Revoke Access';
  const confirmRevokeMessage = (t.treeManager.confirmRevoke || 'Revoke access for {email}?').replace(
    '{email}',
    state.pendingRevokeCollaborator?.email || ''
  );

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <AccessShareLinkSection
          t={t}
          sectionText={sectionText}
          shareLinkLabel={state.shareLinkLabel}
          isCopied={state.isCopied}
          onCopy={state.copyLink}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AccessInviteSection
          t={t}
          sectionText={sectionText}
          inviteEmail={state.inviteEmail}
          inviteRole={state.inviteRole}
          isInviting={state.isInviting}
          onEmailChange={state.setInviteEmail}
          onRoleChange={state.setInviteRole}
          onInvite={state.handleInvite}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AccessCollaboratorsSection
          t={t}
          sectionText={sectionText}
          ownerRow={state.ownerRow}
          collaborators={state.collaborators}
          isLoading={state.isLoading}
          onChangeRole={state.handleChangeRole}
          onRevoke={state.requestRevoke}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AccessPendingInvitationsSection
          t={t}
          sectionText={sectionText}
          pendingInvitations={state.pendingInvitations}
          onRevokeInvitation={state.handleRevokeInvitation}
        />
      </Suspense>

      {state.isConfirmRevokeOpen ? (
        <Suspense fallback={null}>
          <ConfirmationModal
            isOpen={state.isConfirmRevokeOpen}
            onClose={state.closeRevokeConfirm}
            onConfirm={() => void state.confirmRevoke()}
            title={revokeAccessLabel}
            message={confirmRevokeMessage}
            confirmText={revokeAccessLabel}
            type="danger"
            overlayId="access-control-revoke-confirm"
          />
        </Suspense>
      ) : null}
    </div>
  );
};
