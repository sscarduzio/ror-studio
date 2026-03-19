import { useEditorStore } from '@/store/editor-store'
import { GettingStartedTab } from '@/components/templates/GettingStartedTab'
import { AccessControlTab } from '@/components/acl/AccessControlTab'
import { AclFlowTab } from '@/components/acl-flow/AclFlowTab'
import { UsersGroupsTab } from '@/components/layout/tabs/UsersGroupsTab'
import { AuthenticationTab } from '@/components/layout/tabs/AuthenticationTab'
import { AuthorizationTab } from '@/components/layout/tabs/AuthorizationTab'
import { SslTlsTab } from '@/components/layout/tabs/SslTlsTab'
import { AuditTab } from '@/components/layout/tabs/AuditTab'
import { AdvancedTab } from '@/components/layout/tabs/AdvancedTab'

export function TabContainer() {
  const activeTab = useEditorStore((s) => s.activeTab)

  return (
    <div className="p-6 h-full">
      <div key={activeTab} className="tab-fade-in h-full">
        {activeTab === 'getting-started' && <GettingStartedTab />}
        {activeTab === 'access-control' && <AccessControlTab />}
        {activeTab === 'acl-flow' && <AclFlowTab />}
        {activeTab === 'users-groups' && <UsersGroupsTab />}
        {activeTab === 'authentication' && <AuthenticationTab />}
        {activeTab === 'authorization' && <AuthorizationTab />}
        {activeTab === 'ssl-tls' && <SslTlsTab />}
        {activeTab === 'audit' && <AuditTab />}
        {activeTab === 'advanced' && <AdvancedTab />}
      </div>
    </div>
  )
}
