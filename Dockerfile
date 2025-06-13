# Dockerfile

# Use an official Node.js runtime as a parent image.
# Alpine versions are lightweight and great for production.
FROM node:18-alpine

# Create and define the app directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
# This is done separately to leverage Docker's layer caching.
# If these files don't change, Docker won't reinstall dependencies on every build.
COPY package*.json ./

# Install app dependencies
# The --production flag skips devDependencies like eslint, making the image smaller.
RUN npm install --production

# Bundle app source
COPY . .

# Your app binds to port 3000, so we'll expose it
# This is documentation; the compose file will actually map it.
EXPOSE 3000

# Define the command to run your app
CMD [ "node", "index.js" ]