FROM jenkins/jenkins:lts-jdk17

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends git docker.io docker-compose curl jq ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Avoid Git "dubious ownership" errors inside containerized Jenkins workspaces.
RUN git config --system --add safe.directory '*'

RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY casc/jenkins.yaml /usr/share/jenkins/ref/casc_configs/jenkins.yaml

ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/casc_configs/jenkins.yaml
ENV JAVA_OPTS=-Djenkins.install.runSetupWizard=false
