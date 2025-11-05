'use client'

import { useMemo, useCallback, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { type RoleWithDetails } from '@/lib/actions/roles'
import { rolesToFlowData } from './org-chart-utils'
import { OrgChartNode } from './org-chart-node'
import { Briefcase } from 'lucide-react'

interface OrgChartViewProps {
  roles: RoleWithDetails[]
  isAdmin: boolean
}

const nodeTypes: NodeTypes = {
  orgChartNode: OrgChartNode,
}

export function OrgChartView({ roles, isAdmin }: OrgChartViewProps) {
  // Transform roles data into reactflow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => rolesToFlowData(roles, isAdmin),
    [roles, isAdmin]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync ReactFlow state when roles change
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Fit view on mount
  const onInit = useCallback(() => {
    // ReactFlow will automatically fit the view
  }, [])

  if (!roles || roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="rounded-full bg-muted p-6">
          <Briefcase className="size-12 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">No roles to display</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? 'Create your first organizational role to see the chart'
              : 'No roles have been created yet'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[calc(100vh-300px)] min-h-[600px] border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return '#8b5cf6'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-background !border !border-border"
        />
      </ReactFlow>
    </div>
  )
}
