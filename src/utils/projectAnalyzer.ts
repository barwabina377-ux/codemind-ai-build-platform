import JSZip from 'jszip';

export interface ProjectReadiness {
  projectType: 'Android Studio' | 'Gradle' | 'Kotlin' | 'Java' | 'Flutter' | 'React Native' | 'Unknown';
  info: {
    applicationId?: string;
    projectName?: string;
    gradleVersion?: string;
    agpVersion?: string;
    kotlinVersion?: string;
    compileSdk?: string;
    targetSdk?: string;
    minSdk?: string;
    javaVersion?: string;
    modules: string[];
  };
  issues: {
    type: 'missing' | 'warning' | 'error';
    title: string;
    explanation: string;
    recommendation: string;
  }[];
  score: number;
  status: 'Ready' | 'Warning' | 'Error';
}

export async function analyzeProject(loadedZip: JSZip, zipEntries: { name: string; dir: boolean }[]): Promise<ProjectReadiness> {
  let projectType: ProjectReadiness['projectType'] = 'Unknown';
  const info: ProjectReadiness['info'] = { modules: [] };
  const issues: ProjectReadiness['issues'] = [];
  let score = 100;

  const fileNames = zipEntries.map(e => e.name);

  // Detect Project Type
  const hasAndroid = fileNames.some(f => f.includes('AndroidManifest.xml'));
  const hasGradle = fileNames.some(f => f.includes('build.gradle') || f.includes('build.gradle.kts'));
  const hasFlutter = fileNames.some(f => f.includes('pubspec.yaml'));
  const hasReactNative = fileNames.some(f => f.includes('package.json')) && fileNames.some(f => f.includes('ios/') && f.includes('android/'));

  if (hasFlutter) {
    projectType = 'Flutter';
  } else if (hasReactNative) {
    projectType = 'React Native';
  } else if (hasAndroid && hasGradle) {
    projectType = 'Android Studio';
  } else if (hasGradle) {
    projectType = 'Gradle';
  }

  // Find root directory
  const rootEntry = fileNames.find(f => f.endsWith('settings.gradle') || f.endsWith('settings.gradle.kts') || f.endsWith('build.gradle'));
  let rootPrefix = '';
  if (rootEntry) {
    const parts = rootEntry.split('/');
    if (parts.length > 1) {
      rootPrefix = parts.slice(0, -1).join('/') + '/';
    }
  }

  // Helper to read file safely
  const readFile = async (pattern: string) => {
    const file = fileNames.find(f => f.endsWith(pattern) && (f.startsWith(rootPrefix) || rootPrefix === ''));
    if (!file) return null;
    const zipFile = loadedZip.file(file);
    if (!zipFile) return null;
    return await zipFile.async('string');
  };

  // Check structure & extract info
  const settingsGradle = await readFile('settings.gradle') || await readFile('settings.gradle.kts');
  const rootBuildGradle = await readFile('build.gradle') || await readFile('build.gradle.kts');
  
  if (!settingsGradle) {
    issues.push({
      type: 'warning',
      title: 'Missing settings.gradle',
      explanation: 'No settings.gradle or settings.gradle.kts found.',
      recommendation: 'Ensure your project has a settings.gradle file at the root to declare modules.'
    });
    score -= 10;
  } else {
    // Extract modules and project name
    const includeMatch = settingsGradle.match(/include\s*[\(]?['"]([^'"]+)['"]/g);
    if (includeMatch) {
      info.modules = includeMatch.map(m => {
        const match = m.match(/['"]([^'"]+)['"]/);
        return match ? match[1].replace(':', '') : '';
      }).filter(Boolean);
    }
    const nameMatch = settingsGradle.match(/rootProject\.name\s*=\s*['"]([^'"]+)['"]/);
    if (nameMatch) {
      info.projectName = nameMatch[1];
    }
  }

  if (!rootBuildGradle) {
    issues.push({
      type: 'error',
      title: 'Missing root build.gradle',
      explanation: 'No root-level build.gradle or build.gradle.kts found.',
      recommendation: 'Add a root build.gradle file to configure your build.'
    });
    score -= 20;
  }

  // Check wrapper
  const hasWrapper = fileNames.some(f => f.endsWith('gradlew') || f.endsWith('gradle-wrapper.properties'));
  if (!hasWrapper) {
    issues.push({
      type: 'error',
      title: 'Gradle Wrapper missing',
      explanation: 'The Gradle wrapper ensures the project builds with a consistent version of Gradle.',
      recommendation: 'Generate the wrapper by running `gradle wrapper`.'
    });
    score -= 20;
  } else {
    const wrapperProps = await readFile('gradle-wrapper.properties');
    if (wrapperProps) {
      const gradleVersionMatch = wrapperProps.match(/gradle-([0-9.]+)-(bin|all)\.zip/);
      if (gradleVersionMatch) {
        info.gradleVersion = gradleVersionMatch[1];
      }
    }
  }

  // App level build gradle
  const appBuildGradle = await readFile('app/build.gradle') || await readFile('app/build.gradle.kts');
  if (appBuildGradle) {
    const appIdMatch = appBuildGradle.match(/(?:applicationId|namespace)\s*=?\s*['"]([^'"]+)['"]/);
    if (appIdMatch) info.applicationId = appIdMatch[1];

    const compileSdkMatch = appBuildGradle.match(/compileSdk\s*=?\s*([0-9]+)/);
    if (compileSdkMatch) info.compileSdk = compileSdkMatch[1];

    const minSdkMatch = appBuildGradle.match(/minSdk\s*=?\s*([0-9]+)/);
    if (minSdkMatch) info.minSdk = minSdkMatch[1];

    const targetSdkMatch = appBuildGradle.match(/targetSdk\s*=?\s*([0-9]+)/);
    if (targetSdkMatch) info.targetSdk = targetSdkMatch[1];
    
    // Check Java version
    const javaVersionMatch = appBuildGradle.match(/JavaVersion\.VERSION_([0-9_]+)/);
    if (javaVersionMatch) info.javaVersion = javaVersionMatch[1].replace('_', '.');
  } else if (projectType === 'Android Studio') {
    issues.push({
      type: 'warning',
      title: 'Missing app module build file',
      explanation: 'Could not find build.gradle or build.gradle.kts in the app module.',
      recommendation: 'Ensure your app module contains a build script.'
    });
    score -= 10;
  }
  
  const manifest = await readFile('src/main/AndroidManifest.xml');
  if (projectType === 'Android Studio' && !manifest) {
    issues.push({
      type: 'error',
      title: 'Missing AndroidManifest.xml',
      explanation: 'Every Android project requires an AndroidManifest.xml file.',
      recommendation: 'Add AndroidManifest.xml in your src/main directory.'
    });
    score -= 20;
  }

  // Combine root and app gradle to find plugin versions
  const allGradle = (rootBuildGradle || '') + '\n' + (appBuildGradle || '');
  
  const agpMatch = allGradle.match(/(?:com\.android\.application|com\.android\.tools\.build:gradle|id\s*\(\s*['"]com\.android\.application['"]\s*\)\s*version)\s*['"]?([0-9.]+)['"]?/);
  if (agpMatch) {
    info.agpVersion = agpMatch[1];
  } else if (projectType === 'Android Studio') {
      // Sometimes it's defined in version catalog, we just do best effort
  }

  const kotlinMatch = allGradle.match(/(?:org\.jetbrains\.kotlin\.android|id\s*\(\s*['"]org\.jetbrains\.kotlin\.android['"]\s*\)\s*version)\s*['"]?([0-9.]+)['"]?/);
  if (kotlinMatch) {
    info.kotlinVersion = kotlinMatch[1];
  }

  // Dummy logic for dependencies/repos
  if (allGradle && !allGradle.includes('google()')) {
    issues.push({
      type: 'warning',
      title: 'Missing Google Repository',
      explanation: 'The google() repository is typically required for Android projects.',
      recommendation: 'Add google() to your repositories block.'
    });
    score -= 5;
  }

  score = Math.max(0, score);
  
  let status: 'Ready' | 'Warning' | 'Error' = 'Ready';
  if (score < 100) status = 'Warning';
  if (score < 70 || issues.some(i => i.type === 'error')) status = 'Error';

  return {
    projectType,
    info,
    issues,
    score,
    status
  };
}
