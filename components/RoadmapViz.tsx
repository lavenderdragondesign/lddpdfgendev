
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { RoadmapNode } from '../types';

interface RoadmapVizProps {
  data: RoadmapNode;
}

const RoadmapViz: React.FC<RoadmapVizProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = svgRef.current.clientWidth || 800;
    const height = 600;
    const margin = { top: 20, right: 90, bottom: 30, left: 90 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tree = d3.tree<RoadmapNode>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    const root = d3.hierarchy(data);
    tree(root);

    // Links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(99, 102, 241, 0.3)')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      );

    // Nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', (d) => 'node' + (d.children ? ' node--internal' : ' node--leaf'))
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

    node.append('circle')
      .attr('r', 6)
      .attr('fill', (d) => d.depth === 0 ? '#6366f1' : '#1e293b')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', '.35em')
      .attr('x', (d) => d.children ? -12 : 12)
      .attr('style', 'font-size: 12px; font-weight: 500;')
      .attr('fill', '#f3f4f6')
      .style('text-anchor', (d) => d.children ? 'end' : 'start')
      .text((d: any) => d.data.name);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom as any);

  }, [data]);

  return (
    <div className="w-full h-full bg-gray-900/50 rounded-2xl border border-white/5 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">Interactive Graph View</span>
      </div>
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};

export default RoadmapViz;
