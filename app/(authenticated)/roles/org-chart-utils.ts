import { type Node, type Edge, Position } from 'reactflow'
import { type RoleWithDetails } from '@/lib/actions/roles'
import dagre from '@dagrejs/dagre'

export interface OrgChartNodeData {
  role: RoleWithDetails
  allRoles: RoleWithDetails[]
  isAdmin: boolean
}

const NODE_WIDTH = 280
const NODE_HEIGHT = 140

/**
 * Apply dagre layout algorithm to nodes and edges
 * This creates a proper tree layout where children are clustered near parents
 */
function getLayoutedElements(
  nodes: Node<OrgChartNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const isHorizontal = direction === 'LR'

  // Configure graph layout
  dagreGraph.setGraph({
    rankdir: direction, // TB = top to bottom, LR = left to right
    nodesep: 60, // Horizontal spacing between nodes at same level
    ranksep: 120, // Vertical spacing between levels
    marginx: 40, // Horizontal margin
    marginy: 40, // Vertical margin
  })

  // Add nodes to dagre graph with dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run dagre layout algorithm
  dagre.layout(dagreGraph)

  // Apply calculated positions back to React Flow nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)

    return {
      ...node,
      // Dagre uses center coordinates, React Flow uses top-left
      // So we need to offset by half the node dimensions
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      // Set handle positions based on layout direction
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    }
  })

  return { nodes: layoutedNodes, edges }
}

/**
 * Transform roles data into reactflow nodes and edges with dagre layout
 */
export function rolesToFlowData(
  roles: RoleWithDetails[],
  isAdmin: boolean
): { nodes: Node<OrgChartNodeData>[]; edges: Edge[] } {
  const nodes: Node<OrgChartNodeData>[] = []
  const edges: Edge[] = []

  // Create nodes (positions will be set by dagre)
  roles.forEach((role) => {
    nodes.push({
      id: role.id,
      type: 'orgChartNode',
      position: { x: 0, y: 0 }, // Temporary position, will be set by dagre
      data: {
        role,
        allRoles: roles,
        isAdmin,
      },
    })

    // Create edge to parent if exists
    if (role.accountable_to_role_id) {
      edges.push({
        id: `${role.accountable_to_role_id}-${role.id}`,
        source: role.accountable_to_role_id,
        target: role.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      })
    }
  })

  // Apply dagre layout algorithm
  return getLayoutedElements(nodes, edges, 'TB')
}
