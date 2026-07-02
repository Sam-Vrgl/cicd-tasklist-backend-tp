pipeline {
  agent any

  tools {
    nodejs 'Node22'
  }

  environment {
    DOCKERHUB_REPO = 'CHANGE_ME_DOCKERHUB_USERNAME/tasklist-backend'
    IMAGE_TAG      = "${DOCKERHUB_REPO}:${BUILD_NUMBER}"
    IMAGE_LATEST   = "${DOCKERHUB_REPO}:latest"
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
          recordCoverage(tools: [[parser: 'LCOV', pattern: 'coverage/lcov.info']])
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

    stage('SonarCloud Analysis') {
      steps {
        withSonarQubeEnv('SonarCloud') {
          script {
            def scannerHome = tool 'SonarScannerCLI'
            sh "${scannerHome}/bin/sonar-scanner"
          }
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
        sh "docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} ."
      }
    }

    stage('Trivy Image Scan') {
      steps {
        sh "trivy image --exit-code 0 --severity HIGH,CRITICAL --format table -o trivy-report.txt ${IMAGE_TAG}"
      }
      post {
        always {
          archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
        }
      }
    }

    stage('Generate SBOM (SPDX)') {
      steps {
        sh "syft ${IMAGE_TAG} -o spdx-json=sbom-spdx.json"
      }
      post {
        always {
          archiveArtifacts artifacts: 'sbom-spdx.json', allowEmptyArchive: true
        }
      }
    }

    stage('Docker Push') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKERHUB_USER',
          passwordVariable: 'DOCKERHUB_PASS'
        )]) {
          sh 'echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin'
          sh "docker push ${IMAGE_TAG}"
          sh "docker push ${IMAGE_LATEST}"
          sh 'docker logout'
        }
      }
    }
  }

  post {
    always {
      cleanWs(patterns: [[pattern: 'node_modules/**', type: 'EXCLUDE']])
    }
  }
}
