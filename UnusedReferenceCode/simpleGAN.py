import numpy as np
from numpy import ones
from numpy import zeros
from numpy.random import random
from numpy.random import randn
from numpy import vstack
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.optimizers import Adam
from keras.layers import Dense
from keras.layers import Reshape
from keras.layers import Flatten
from keras.layers import LeakyReLU
from keras.layers import BatchNormalization
#from keras.layers import Conv
import glob
import json
import os
import pandas as pd
from matplotlib import pyplot
from matplotlib import axes

# Get a list of the files in the directory and read them all into a numpy array
def readData():
    files = glob.glob('./training/*.json')
    pathsList = []
    for file in files:
        path = pd.read_json(file)
        path.drop(['Percent Padded', 'MMSI'], axis= 1, inplace= True)
        singlePath = path.values.squeeze().tolist()
        pathsList.append(singlePath)

    pathsArray = np.array(pathsList)
    print(pathsArray)
    return pathsArray

# collect real data, and create an array of 1s for the target value
def generateRealSamples(dataset, nSamples):
    # grab all instances
    X = dataset[0:nSamples]
    y = ones((len(X), 1))
    # Apply label smoothing
    #y = y - 0.3 + (random(y.shape) * 0.5)
    return X, y

# Generate fake samples using the generator, attach 0's for the target value
def generateFakeSamples(model, latentDim, nSamples):
    # Generate latent points
    xInput = generateLatentPoints(latentDim, nSamples)
    # use the model to predect on the latent points
    X = model.predict(xInput)
    y = zeros((nSamples,1))
    # use label smoothing
    #y = y + random(y.shape) * 0.3
    return X, y

# Create a discriminator shape in (none, len(data[0]), len(data[0][0])) shape out (none, 1)
def createDiscriminator(inShape):
    discriminator = keras.Sequential(name='discriminator')
    #downsample
    #discriminator.add(Conv2D)
    discriminator.add(Flatten(input_shape=inShape))
    discriminator.add(BatchNormalization())
    discriminator.add(Dense(64, activation='LeakyReLU', kernel_initializer='he_uniform'))
    discriminator.add(Dense(32, activation='LeakyReLU'))

    discriminator.add(Dense(1, activation='sigmoid'))
    
    #discriminator.build(input_shape=inShape)
    # compile model
    opt = Adam(lr=0.0002, beta_1=0.5)
    discriminator.compile(loss='binary_crossentropy', optimizer=opt, metrics=['accuracy'])
    discriminator.summary()
    return discriminator

# Create latent points using latentDim and the number of paths (nSamples)
def generateLatentPoints(latentDim, nSamples):
    # returns an array of size (latentDim * nSamples) containing a Gaussian distribution
    xInput = randn(latentDim * nSamples)
    # reshape the array from single dimensional, to shape (nSamples, latentDim)
    xInput = xInput.reshape(nSamples, latentDim)
    return xInput

# Create the generator input shape (none, latentDim) output shape (none, countPoints, countFeatures)
def createGenerator(latentDim, countPoints, countFeatures):
    generator = keras.Sequential(name='generator')
    nNodes = countPoints * countFeatures
    generator.add(BatchNormalization(input_dim=latentDim))
    #generator.add(Flatten(input_dim=latentDim))
    generator.add(Dense(nNodes, activation='LeakyReLU', kernel_initializer='he_uniform'))
    generator.add(Dense(nNodes, activation='linear'))
    generator.add(Reshape((countPoints, countFeatures)))
    generator.summary()
    return generator

# compile generator and discriminator input shape (none, latentDim) output shape (none, 1)
def createGAN(gModel, dModel):
    # make the discriminator untrainable so the generator can train
    # make weights in the discriminator not trainable
    for layer in dModel.layers:
        if not isinstance(layer, BatchNormalization):
            layer.trainable = False
    model = keras.Sequential(name='gan')
    model.add(gModel)
    model.add(dModel)
    opt = Adam(lr=0.0002, beta_1=0.5)
    model.compile(loss='binary_crossentropy', optimizer=opt, metrics=['accuracy'])
    
    return model

# create a line plot of loss for the gan and save to file
def plot_history(d1_hist, d2_hist, g_hist, a1_hist, a2_hist):
	# plot loss
    pyplot.figure(figsize=(10,20))

    pyplot.subplot(2, 1, 1)
    pyplot.gca().set_title('All Loss', y=1)
    pyplot.plot(d1_hist, label='d loss real')
    pyplot.plot(d2_hist, label='d loss fake')
    pyplot.plot(g_hist, label='gen loss')
    pyplot.legend()
	# plot discriminator accuracy
    pyplot.subplot(2, 1, 2)
    pyplot.gca().set_title('Discriminator Accuracy', y=1)
    pyplot.plot(a1_hist, label='acc-real')
    pyplot.plot(a2_hist, label='acc-fake')
    pyplot.legend()
    
    pyplot.tight_layout()
	# save plot to file
    pyplot.savefig('./results_baseline/plot_line_plot_loss.png')
    pyplot.close('all')

# Train the model
def train(dModel, gModel, ganModel, dataset, latentDim, epochs, nBatch):
    batchPerEpoch = int(dataset.shape[0] / nBatch)
    halfBatch = int(nBatch / 2)
    #nSteps = batchPerEpoch * epochs
    # prepare lists for storing stats each iteration
    d1_hist, d2_hist, g_hist, a1_hist, a2_hist = list(), list(), list(), list(), list()
	# manually enumerate epochs
    for i in range(epochs):
        # every epoch loop through every available path
        for j in range(batchPerEpoch):
            # get real samples
            X_real, y_real = generateRealSamples(dataset, halfBatch)
            # generate fake samples, not sure if this is working correctly
            X_fake, y_fake = generateFakeSamples(gModel, latentDim, halfBatch)
            

            # update discriminator 
            # (separate batch updates may help keep stable performance)
            # https://machinelearningmastery.com/how-to-code-generative-adversarial-network-hacks/
            dRealLoss, dRealAcc = dModel.train_on_batch(X_real, y_real)
            dFakeLoss, dFakeAcc = dModel.train_on_batch(X_fake, y_fake)

            if(dRealLoss <= 0.0 ) or (dFakeLoss <= 0.0):
                #indicates failure
                print("Trainig Failure!!!")
            

            # generate latent points to input into the generator
            X = generateLatentPoints(latentDim, nBatch)
            # add inverse labels for XGAN samples
            y = ones((nBatch, 1))
            # Apply label smoothing
            y = y - 0.3 + (random(y.shape) * 0.5)
            # trains the gan (generator?) on new latent points
            gLoss, _ = ganModel.train_on_batch(X, y)

            # record history
            d1_hist.append(dRealLoss)
            d2_hist.append(dFakeLoss)
            g_hist.append(gLoss)
            a1_hist.append(dRealAcc)
            a2_hist.append(dFakeAcc)
            # print loss from each batch
            print('>%d, %d/%d, disc real Loss=%.5f, disc fake Loss=%.5f, gen loss=%.5f' % (i+1, j+1, batchPerEpoch, dRealLoss, dFakeLoss, gLoss))
            print('>Accuracy real: %.0f%%, fake: %.0f%%' % (dRealAcc*100, dFakeAcc*100))

        # evaluate the model performance, every 10 epochs
        if (i+1) % 10 == 0:
            outputPaths(X_fake, i, j) 
            plot_history(d1_hist, d2_hist, g_hist, a1_hist, a2_hist)

# Get the accuracy of the model
def getPerformance(epoch, gModel, dModel, dataset, latentDim, nSamples):

    # prepare real samples
    XReal, yReal = generateRealSamples(dataset, nSamples)
	# evaluate discriminator on real examples
    lossOnReal, accuracyOnReal = dModel.evaluate(XReal, yReal, verbose=0)
	# prepare fake examples
    xFake, yFake = generateFakeSamples(gModel, latentDim, nSamples)
    # create jsons from fake samples
    outputPaths(xFake)
	# evaluate discriminator on fake examples
    lossOnFake, accuracyOnFake = dModel.evaluate(xFake, yFake, verbose=0)
	# summarize discriminator performance
    print('>Accuracy real: %.0f%%, fake: %.0f%%' % (accuracyOnReal*100, accuracyOnFake*100))
    
    # scatter plot real and fake data points
    #test = XReal[0:][:, 0]
    #fig, ax = pyplot.subplots()
    #for i in range(len(XReal)):
    #    ax.scatter(XReal[i][:, 1], XReal[i][:, 2], color='red')
    #    ax.scatter(xFake[i][:, 1], xFake[i][:, 2], color='blue')
    #ax.set_xlabel('Lat')
    #ax.set_ylabel('Lon')
    #pyplot.show()


    #print('>Loss real: %.0f%%, fake: %.0f%%' % (lossOnReal, lossOnFake))

# Function to clear any old json files from the output folder
def clearJsons():
    '''Deletes all JSON files in ./generated/ folder'''

    print('Clearning JSON files in generated file.')
    removed = 0
    for folder in glob.glob('.\\generated\\*'):
        for file in glob.glob('%s\\*.json' %folder):
            os.remove(file) 
            removed = removed + 1
        os.rmdir(folder)
    print('Removed: %d files.' % removed)

# Output paths to json
def outputPaths(paths, epochNumber, batchNumber):
    for pathNum, path in enumerate(paths):
        dfPath = pd.DataFrame(path, columns=['BaseDateTime', 'LAT', 'LON', 'SOG', 'COG', 'Heading'])
        dfPath.reset_index(drop=True, inplace=True)
        MMSI = str(pathNum)

        pathStr = dfPath.to_json(orient = 'values', indent = 4)

        pathObj = { 'MMSI' : MMSI, 'PathData' : json.loads(pathStr)}
        # if a folder for the epoch doesn't exist, create it
        if(not(os.path.exists('./generated/Epoch%d' % epochNumber))):
            os.makedirs('./generated/Epoch%d' % epochNumber)

        with open('./generated/Epoch%d/Batch%dPath%d.json' % (epochNumber, batchNumber, pathNum),'w') as file:
                json.dump(pathObj, file, indent=4)


data = readData()
latentDim = 32
epochs = 3000
# Shape of each path
dataShape = (len(data[0]), len(data[0][0]))
# number of batches to divide the data into for each epoch, max is dataShape[0]
nBatch = 50  #int(len(data) / 10)
discrim = createDiscriminator(dataShape)
generator = createGenerator(latentDim, dataShape[0], dataShape[1])
gan = createGAN(generator, discrim)

clearJsons()
train(discrim, generator, gan, data, latentDim, epochs, nBatch)

print('done')