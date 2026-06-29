import React from 'react';
import { ProjectReadiness } from '../utils/projectAnalyzer';
import { Box, Code2, Layers, Cpu, Hash, ListTree, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

export function ProjectInfoCard({ readiness }: { readiness: ProjectReadiness }) {
  if (!readiness) return null;

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Box size={18} className="text-blue-500" />
        <h3 className="font-semibold text-gray-900 text-sm">Smart Project Analytics</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <InfoItem icon={<Layers />} label="Project Type" value={readiness.projectType} />
        <InfoItem icon={<Code2 />} label="Language" value={readiness.info.kotlinVersion ? 'Kotlin' : (readiness.info.javaVersion ? 'Java' : 'Mixed')} />
        <InfoItem icon={<Cpu />} label="Min SDK" value={readiness.info.minSdk || 'N/A'} />
        <InfoItem icon={<Zap />} label="Target SDK" value={readiness.info.targetSdk || 'N/A'} />
        <InfoItem icon={<Hash />} label="Gradle Version" value={readiness.info.gradleVersion || 'N/A'} />
        <InfoItem icon={<ListTree />} label="Total Modules" value={readiness.info.modules.length.toString()} />
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="flex gap-4">
          <span className="text-gray-500">Package: <span className="font-medium text-gray-900">{readiness.info.applicationId || 'Unknown'}</span></span>
          <span className="text-gray-500">AGP: <span className="font-medium text-gray-900">{readiness.info.agpVersion || 'Unknown'}</span></span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-gray-500">Readiness:</span>
           <span className={`px-2 py-1 rounded font-medium flex items-center gap-1 ${
             readiness.status === 'Ready' ? 'bg-emerald-50 text-emerald-700' :
             readiness.status === 'Warning' ? 'bg-orange-50 text-orange-700' :
             'bg-red-50 text-red-700'
           }`}>
             {readiness.status === 'Ready' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
             {readiness.score}%
           </span>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
        {React.cloneElement(icon as React.ReactElement, { size: 12 } as any)}
        <span>{label}</span>
      </div>
      <span className="font-medium text-gray-900 text-sm truncate" title={value}>{value}</span>
    </div>
  );
}
