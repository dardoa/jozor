import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { useAccessControlState } from './accessControl/useAccessControlState';
import type { AccessControlTabProps } from './accessControl/accessControlTypes';
import { AccessCollaboratorsSection } from './accessControl/AccessCollaboratorsSection';
import { AccessInviteSection } from './accessControl/AccessInviteSection';
import { AccessPendingInvitationsSection } from './accessControl/AccessPendingInvitationsSection';
import { AccessShareLinkSection } from './accessControl/AccessShareLinkSection';

export const AccessControlTab: React.FC<AccessControlTabProps> = ({
  treeId,
  ownerId,
  ownerEmail,
}) => {
  const { t } = useTranslation();
  const sectionText = t.adminHub.accessSections;
  const state = useAccessControlState({ treeId, ownerId, ownerEmail });
  const revokeAccessLabel = t.treeManager.revokeAccess || 'Revoke Access';
  const confirmRevokeMessage = (t.treeManager.confirmRevoke || 'Revoke access for {email}?').replace(
    '{email}',
    state.pendingRevokeCollaborator?.email || ''
  );
  
  const isOwner = state.currentUserRole === 'owner';

  return (
    <div>
      <AccessShareLinkSection
        t={t}
        sectionText={sectionText}
        shareLinkLabel={state.shareLinkLabel}
        isCopied={state.isCopied}
        onCopy={state.copyLink}
      />

      {isOwner && (
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
      )}

      <AccessCollaboratorsSection
        t={t}
        sectionText={sectionText}
        ownerRow={state.ownerRow}
        collaborators={state.collaborators}
        isLoading={state.isLoading}
        onChangeRole={state.handleChangeRole}
        onRevoke={state.requestRevoke}
        canManage={isOwner}
      />

      {isOwner && (
        <AccessPendingInvitationsSection
          t={t}
          sectionText={sectionText}
          pendingInvitations={state.pendingInvitations}
          onRevokeInvitation={state.handleRevokeInvitation}
        />
      )}

      {state.isConfirmRevokeOpen ? (
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
      ) : null}
    </div>
  );
};
