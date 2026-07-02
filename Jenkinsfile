pipeline {
  agent any

  tools {
    nodejs 'nodejs' // must match the Name field you set in Manage Jenkins → Tools
  }

  environment {
    DOCKERHUB_CREDENTIALS = credentials('samuelv-dockerhub-credentials')
    IMAGE_NAME = 'samvrgl/cicd-tasklist-backend'
    IMAGE_TAG  = "${env.BUILD_NUMBER}"
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Build (TypeScript)') {
      steps {
        sh 'npx prisma generate --schema=prisma/schema.prisma'
        sh 'npm run build'
      }
    }

    stage('Unit Tests') {
      steps {
        sh 'npm run test:coverage'
      }
      post {
        always {
          junit 'reports/junit.xml'
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
      }
    }

    stage('E2E Tests') {
      steps {
        sh 'npm run test:e2e'
      }
      post {
        always {
          junit 'reports/junit.xml'
        }
      }
    }

    stage('NPM Audit') {
      steps {
        sh 'npm audit --audit-level=high || true'
        sh 'npm audit --json > npm-audit-report.json || true'
      }
      post {
        always {
          archiveArtifacts artifacts: 'npm-audit-report.json', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv(installationName: 'sonarqube-server-2', credentialsId: 'samuelv-sonarqube-credentials') {
          sh 'npx sonar-scanner'
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Docker Build') {
      steps {
        sh "docker build --provenance=false --sbom=false -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest ."
      }
    }

    stage('Trivy Scan') {
      steps {
        sh "trivy image --cache-dir ${WORKSPACE}/.trivycache --exit-code 0 --severity HIGH,CRITICAL --format table ${IMAGE_NAME}:${IMAGE_TAG}"
      }
    }

    stage('SBOM Generation') {
      steps {
        sh "trivy image --cache-dir ${WORKSPACE}/.trivycache --format spdx-json --output sbom-spdx.json ${IMAGE_NAME}:${IMAGE_TAG}"
      }
      post {
        always {
          archiveArtifacts artifacts: 'sbom-spdx.json', fingerprint: true
        }
      }
    }

    stage('Docker Push') {
      steps {
        sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
        sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
        sh "docker push ${IMAGE_NAME}:latest"
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
    }
  }
}
