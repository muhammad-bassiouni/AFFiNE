import { pushNotificationAtom } from '@affine/component/notification-center';
import type { ShareMode } from '@affine/component/share-menu/use-share-url';
import {
  getWorkspacePublicPagesQuery,
  PublicPageMode,
  publishPageMutation,
  revokePublicPageMutation,
} from '@affine/graphql';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useMutation, useQuery } from '@affine/workspace/affine/gql';
import { useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

export function useIsSharedPage(
  workspaceId: string,
  pageId: string
): {
  isSharedPage: boolean;
  toggleShare: (enable: boolean, shareMode?: ShareMode) => void;
} {
  const t = useAFFiNEI18N();
  const pushNotification = useSetAtom(pushNotificationAtom);
  const { data, mutate } = useQuery({
    query: getWorkspacePublicPagesQuery,
    variables: {
      workspaceId,
    },
  });

  const { trigger: enableSharePage } = useMutation({
    mutation: publishPageMutation,
  });
  const { trigger: disableSharePage } = useMutation({
    mutation: revokePublicPageMutation,
  });

  const isSharedPage = useMemo(
    () =>
      data?.workspace.publicPages.some(publicPage => publicPage.id === pageId),
    [data?.workspace.publicPages, pageId]
  );

  const toggleShare = useCallback(
    (enable: boolean, mode?: ShareMode) => {
      // todo: push notification
      const publishMode =
        mode === 'edgeless' ? PublicPageMode.Edgeless : PublicPageMode.Page;
      if (enable && mode) {
        enableSharePage({
          workspaceId,
          pageId,
          mode: publishMode,
        })
          .then(() => {
            pushNotification({
              title:
                t[
                  'com.affine.share-menu.create-public-link.notification.success.title'
                ](),
              message:
                t[
                  'com.affine.share-menu.create-public-link.notification.success.message'
                ](),
              type: 'success',
              theme: 'default',
            });
            return mutate();
          })
          .catch(e => {
            pushNotification({
              title:
                t[
                  'com.affine.share-menu.create-public-link.notification.fail.title'
                ](),
              message:
                t[
                  'com.affine.share-menu.create-public-link.notification.fail.message'
                ](),
              type: 'error',
            });
            console.error(e);
          });
      } else {
        disableSharePage({
          workspaceId,
          pageId,
        })
          .then(() => {
            pushNotification({
              title:
                t[
                  'com.affine.share-menu.disable-publish-link.notification.success.title'
                ](),
              message:
                t[
                  'com.affine.share-menu.disable-publish-link.notification.success.message'
                ](),
              type: 'success',
              theme: 'default',
            });
            return mutate();
          })
          .catch(e => {
            pushNotification({
              title:
                t[
                  'com.affine.share-menu.disable-publish-link.notification.fail.title'
                ](),
              message:
                t[
                  'com.affine.share-menu.disable-publish-link.notification.fail.message'
                ](),
              type: 'error',
            });
            console.error(e);
          });
      }
      mutate().catch(console.error);
    },
    [
      disableSharePage,
      enableSharePage,
      mutate,
      pageId,
      pushNotification,
      t,
      workspaceId,
    ]
  );

  return useMemo(
    () => ({
      isSharedPage,
      toggleShare,
    }),
    [isSharedPage, toggleShare]
  );
}
