import { pushNotificationAtom } from '@affine/component/notification-center';
import type { ShareMode } from '@affine/component/share-menu/use-share-url';
import {
  getWorkspacePublicPagesQuery,
  PublicPageMode,
  publishPageMutation,
} from '@affine/graphql';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useMutation, useQuery } from '@affine/workspace/affine/gql';
import { useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

export function useShareMode(
  workspaceId: string,
  pageId: string
): [ShareMode, (shareMode: ShareMode) => void] {
  const t = useAFFiNEI18N();
  const pushNotification = useSetAtom(pushNotificationAtom);
  const { data, mutate } = useQuery({
    query: getWorkspacePublicPagesQuery,
    variables: {
      workspaceId,
    },
  });

  const { trigger: updatePublishPage } = useMutation({
    mutation: publishPageMutation,
  });

  const publicPage = data?.workspace.publicPages.find(
    publicPage => publicPage.id === pageId
  );

  const shareMode = useMemo(
    () => (publicPage?.mode === PublicPageMode.Edgeless ? 'edgeless' : 'page'),
    [publicPage?.mode]
  );

  const updateShareMode = useCallback(
    (shareMode: ShareMode) => {
      if (!publicPage) {
        return;
      }
      updatePublishPage({
        workspaceId,
        pageId,
        mode:
          shareMode === 'edgeless'
            ? PublicPageMode.Edgeless
            : PublicPageMode.Page,
      })
        .then(() => {
          pushNotification({
            title:
              t[
                'com.affine.share-menu.confirm-modify-mode.notification.success.title'
              ](),
            message: t[
              'com.affine.share-menu.confirm-modify-mode.notification.success.message'
            ]({
              preMode: publicPage.mode,
              currentMode:
                publicPage.mode === PublicPageMode.Edgeless
                  ? PublicPageMode.Page
                  : PublicPageMode.Edgeless,
            }),
            type: 'success',
            theme: 'default',
          });
          mutate();
        })
        .catch(e => {
          pushNotification({
            title:
              t[
                'com.affine.share-menu.confirm-modify-mode.notification.fail.title'
              ](),
            message:
              t[
                'com.affine.share-menu.confirm-modify-mode.notification.fail.message'
              ](),
            type: 'error',
          });
          console.error(e);
        });
    },
    [
      publicPage,
      updatePublishPage,
      workspaceId,
      pageId,
      pushNotification,
      t,
      mutate,
    ]
  );

  return [shareMode, updateShareMode];
}
