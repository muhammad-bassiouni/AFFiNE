import { pushNotificationAtom } from '@affine/component/notification-center';
import {
  AffineShapeIcon,
  currentCollectionAtom,
  useCollectionManager,
  useEditCollection,
} from '@affine/component/page-list';
import type { Collection } from '@affine/env/filter';
import {
  CloseIcon,
  FilterIcon,
  PageIcon,
  ViewLayersIcon,
} from '@blocksuite/icons';
import { getCurrentStore } from '@toeverything/infra/atom';
import { useAtomValue } from 'jotai';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { type LoaderFunction, redirect, useParams } from 'react-router-dom';

import {
  collectionsCRUDAtom,
  pageCollectionBaseAtom,
} from '../../atoms/collections';
import { useAllPageListConfig } from '../../hooks/affine/use-all-page-list-config';
import { useCurrentWorkspace } from '../../hooks/current/use-current-workspace';
import { useNavigateHelper } from '../../hooks/use-navigate-helper';
import { WorkspaceSubPath } from '../../shared';
import { getWorkspaceSetting } from '../../utils/workspace-setting';
import { AllPage } from './all-page';
import * as styles from './collection.css';

export const loader: LoaderFunction = async args => {
  const rootStore = getCurrentStore();
  if (!args.params.collectionId) {
    return redirect('/404');
  }
  rootStore.set(currentCollectionAtom, args.params.collectionId);
  return null;
};

export const Component = function CollectionPage() {
  const { collections, loading } = useAtomValue(pageCollectionBaseAtom);
  const navigate = useNavigateHelper();
  const params = useParams();
  const [workspace] = useCurrentWorkspace();
  const collection = collections.find(v => v.id === params.collectionId);
  const pushNotification = useSetAtom(pushNotificationAtom);
  useEffect(() => {
    if (!loading && !collection) {
      navigate.jumpToSubPath(workspace.id, WorkspaceSubPath.ALL);
      const collection = getWorkspaceSetting(
        workspace.blockSuiteWorkspace
      ).collectionsTrash.find(v => v.collection.id === params.collectionId);
      let text = 'Collection is not exist';
      if (collection) {
        if (collection.userId) {
          text = `${collection.collection.name} is deleted by ${collection.userName}`;
        } else {
          text = `${collection.collection.name} is deleted`;
        }
      }
      pushNotification({
        type: 'error',
        title: text,
      });
    }
  }, [
    collection,
    loading,
    navigate,
    params.collectionId,
    pushNotification,
    workspace.blockSuiteWorkspace,
    workspace.id,
  ]);
  if (loading) {
    return null;
  }
  if (!collection) {
    return null;
  }
  return isEmpty(collection) ? (
    <Placeholder collection={collection} />
  ) : (
    <AllPage />
  );
};

const Placeholder = ({ collection }: { collection: Collection }) => {
  const { updateCollection } = useCollectionManager(collectionsCRUDAtom);
  const { node, open } = useEditCollection(useAllPageListConfig());
  const openPageEdit = useCallback(() => {
    open({ ...collection, mode: 'page' }).then(updateCollection);
  }, [open, collection, updateCollection]);
  const openRuleEdit = useCallback(() => {
    open({ ...collection, mode: 'rule' }).then(updateCollection);
  }, [collection, open, updateCollection]);
  const [showTips, setShowTips] = useState(false);
  useEffect(() => {
    setShowTips(!localStorage.getItem('hide-empty-collection-help-info'));
  }, []);
  const hideTips = useCallback(() => {
    setShowTips(false);
    localStorage.setItem('hide-empty-collection-help-info', 'true');
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--affine-text-secondary-color)',
          }}
        >
          <ViewLayersIcon style={{ color: 'var(--affine-icon-color)' }} />
          All Collections
          <div>/</div>
        </div>
        <div
          data-testid="collection-name"
          style={{ fontWeight: 600, color: 'var(--affine-text-primary-color)' }}
        >
          {collection.name}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          gap: 64,
        }}
      >
        <div
          style={{
            maxWidth: 432,
            marginTop: 118,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            margin: '118px 12px 0',
          }}
        >
          <AffineShapeIcon />
          <div
            style={{
              fontSize: 20,
              lineHeight: '28px',
              fontWeight: 600,
              color: 'var(--affine-text-primary-color)',
            }}
          >
            Empty Collection
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: '20px',
              color: 'var(--affine-text-secondary-color)',
              textAlign: 'center',
            }}
          >
            Collection is a smart folder where you can manually add pages or
            automatically add pages through rules.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px 32px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <div onClick={openPageEdit} className={styles.placeholderButton}>
              <PageIcon
                style={{
                  width: 20,
                  height: 20,
                  color: 'var(--affine-icon-color)',
                }}
              />
              <span style={{ padding: '0 4px' }}>Add Pages</span>
            </div>
            <div onClick={openRuleEdit} className={styles.placeholderButton}>
              <FilterIcon
                style={{
                  width: 20,
                  height: 20,
                  color: 'var(--affine-icon-color)',
                }}
              />
              <span style={{ padding: '0 4px' }}>Add Rules</span>
            </div>
          </div>
        </div>
        {showTips ? (
          <div
            style={{
              maxWidth: 452,
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--affine-background-overlay-panel-color)',
              padding: 10,
              gap: 14,
              margin: '0 12px',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                lineHeight: '20px',
                color: 'var(--affine-text-secondary-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>HELP INFO</div>
              <CloseIcon
                className={styles.button}
                style={{ width: 16, height: 16 }}
                onClick={hideTips}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 12,
                lineHeight: '20px',
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>Add pages:</span> You can
                freely select pages and add them to the collection.
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Add rules:</span> Rules are
                based on filtering. After adding rules, pages that meet the
                requirements will be automatically added to the current
                collection.
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {node}
    </div>
  );
};

const isEmpty = (collection: Collection) => {
  return (
    (collection.mode === 'page' && collection.pages.length === 0) ||
    (collection.mode === 'rule' &&
      collection.allowList.length === 0 &&
      collection.filterList.length === 0)
  );
};
